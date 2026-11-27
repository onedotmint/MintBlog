import assert from 'node:assert/strict'
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const script = fileURLToPath(new URL('../scripts/deploy.sh', import.meta.url))
const previous = `sha256:${'a'.repeat(64)}`
const previousDigest = `ghcr.io/owner/mintblog@sha256:${'b'.repeat(64)}`
const target = `ghcr.io/owner/mintblog@sha256:${'c'.repeat(64)}`
const targetId = `sha256:${'d'.repeat(64)}`

const mockDocker = String.raw`#!${process.execPath}
const fs = require('node:fs')
const args = process.argv.slice(2)
const scenario = process.env.DEPLOY_SCENARIO
const image = process.env.BLOG_IMAGE
fs.appendFileSync('docker.log', JSON.stringify({ args, image }) + '\n')
const [command, action] = args
if (command === 'compose' && action === 'config') {
  console.log(scenario === 'fixed-image' ? '${previousDigest}' : scenario === 'fixed-target' ? '${target}' : image)
}
if (command === 'compose' && action === 'ps') {
  if (args.includes('--all')) {
    if (!['first-failure', 'no-env'].includes(scenario)) console.log('old-container')
  } else {
    console.log(fs.readFileSync('running-container', 'utf8'))
  }
}
if (command === 'compose' && action === 'pull' && scenario === 'pull-failure') process.exit(1)
if (command === 'image' && action === 'inspect') {
  if (scenario === 'missing-target-id') process.exit(1)
  console.log('${targetId}')
}
if (command === 'compose' && action === 'up') {
  const restoring = image === '${previous}'
  if ((!restoring && ['start-failure', 'first-failure', 'rollback-failure', 'wrong-recovery-id'].includes(scenario)) ||
      (restoring && scenario === 'rollback-failure')) process.exit(1)
  fs.writeFileSync('running-container', restoring ? 'restored-container' : 'new-container')
}
if (command === 'inspect') {
  switch (args.at(-1)) {
    case 'old-container': console.log('${previous}'); break
    case 'new-container': console.log((scenario === 'wrong-target-id' ? '${previous}' : '${targetId}') + (scenario === 'no-health' ? ' ' : ' healthy')); break
    case 'restored-container': console.log((scenario === 'wrong-recovery-id' ? '${targetId}' : '${previous}') + ' healthy'); break
    default: process.exit(1)
  }
}
`

const oldEnv = `# Server settings\nBLOG_IMAGE=${previousDigest}\nMINTBLOG_PROXY_NETWORK=proxy\nOTHER="keep me"\nexport BLOG_IMAGE = duplicate-version\n`

interface DockerCall {
  args: string[]
  image: string
}

const scenarios = [
  'success',
  'no-env',
  'symlink',
  'locked',
  'fixed-image',
  'fixed-target',
  'pull-failure',
  'missing-target-id',
  'start-failure',
  'first-failure',
  'wrong-target-id',
  'no-health',
  'rollback-failure',
  'wrong-recovery-id',
  'save-failure',
]
for (const scenario of scenarios) {
  test(`digest deployment handles ${scenario} with mocked Docker`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mintblog-deploy-'))
    try {
      const path = (name: string) => join(directory, name)
      await writeFile(path('docker-compose.yml'), 'services: {}\n')
      if (scenario === 'symlink') {
        await writeFile(path('settings'), oldEnv)
        await symlink('settings', path('.env'))
      } else if (scenario !== 'no-env') {
        await writeFile(path('.env'), oldEnv, { mode: 0o640 })
      }
      await writeFile(path('docker'), mockDocker, { mode: 0o700 })
      if (scenario === 'save-failure') {
        await writeFile(path('mv'), '#!/bin/sh\nexit 1\n', { mode: 0o700 })
      }

      const result = spawnSync(
        scenario === 'locked' ? 'flock' : 'bash',
        scenario === 'locked'
          ? ['.mintblog-deploy.lock', 'bash', script, target]
          : [script, target],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            DEPLOY_SCENARIO: scenario,
          },
        },
      )
      const success = ['success', 'no-env'].includes(scenario)
      assert.equal(result.status, success ? 0 : 1, result.stderr)
      assert.equal(
        (await readdir(directory)).some((name) => name.startsWith('.env.')),
        false,
      )
      assert.equal(
        await readFile(path('.env'), 'utf8'),
        scenario === 'no-env'
          ? `BLOG_IMAGE=${target}\n`
          : success
            ? `# Server settings\nMINTBLOG_PROXY_NETWORK=proxy\nOTHER="keep me"\nBLOG_IMAGE=${target}\n`
            : oldEnv,
      )
      if (scenario === 'symlink' || scenario === 'locked') {
        assert.match(
          result.stderr,
          scenario === 'symlink' ? /symlink/ : /already running/,
        )
        await assert.rejects(readFile(path('docker.log')), { code: 'ENOENT' })
        return
      }
      assert.equal(
        (await stat(path('.env'))).mode & 0o777,
        scenario === 'no-env' ? 0o600 : 0o640,
      )
      const calls: DockerCall[] = (await readFile(path('docker.log'), 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
      const start = calls.filter(({ args }) => args[1] === 'up')
      const pull = calls.findIndex(({ args }) => args[1] === 'pull')
      if (scenario === 'fixed-image' || scenario === 'fixed-target') {
        assert.equal(pull, -1)
        assert.equal(start.length, 0)
        return
      }
      assert.deepEqual(calls[pull], {
        args: ['compose', 'pull', 'web'],
        image: target,
      })
      if (scenario === 'pull-failure' || scenario === 'missing-target-id') {
        assert.equal(start.length, 0)
        assert.ok(!calls.some(({ args }) => args[1] === 'stop'))
        return
      }
      const identify = calls.findIndex(
        ({ args }) => args[0] === 'image' && args[1] === 'inspect',
      )
      assert.ok(pull < identify && identify < calls.indexOf(start[0]))
      assert.equal(calls[identify].args.at(-1), target)
      assert.equal(start[0].image, target)
      for (const { args } of start) {
        assert.ok(args.includes('--wait'))
        assert.ok(args.includes('--pull') && args.includes('never'))
      }
      if (success) {
        assert.equal(start.length, 1)
        assert.ok(
          calls.some(
            ({ args }) =>
              args[0] === 'inspect' && args.at(-1) === 'new-container',
          ),
        )
        assert.ok(result.stdout.includes(targetId))
        assert.match(result.stdout, /Saved the running image in .env/)
      } else if (scenario === 'first-failure') {
        assert.equal(start.length, 1)
        assert.ok(calls.some(({ args }) => args[1] === 'stop'))
      } else {
        assert.equal(start.length, 2)
        assert.equal(start[1].image, previous)
        if (scenario !== 'rollback-failure') {
          assert.ok(
            calls.some(
              ({ args }) =>
                args[0] === 'inspect' && args.at(-1) === 'restored-container',
            ),
          )
        }
        if (['rollback-failure', 'wrong-recovery-id'].includes(scenario)) {
          assert.match(result.stderr, /Rollback failed/)
          assert.doesNotMatch(result.stderr, /Previous image is healthy/)
        } else {
          assert.match(result.stderr, /Previous image is healthy/)
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
}

test('no argument and non-digest arguments refuse before any Docker or default changes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mintblog-no-deploy-'))
  try {
    await writeFile(join(directory, 'docker-compose.yml'), 'services: {}\n')
    await writeFile(join(directory, 'docker'), mockDocker, { mode: 0o700 })
    await writeFile(join(directory, '.env'), oldEnv)
    for (const args of [
      [],
      [''],
      ['ghcr.io/owner/mintblog:latest'],
      [`ghcr.io/owner/mintblog:sha-${'f'.repeat(40)}`],
      ['ghcr.io/owner/mintblog@sha256:abcd'],
      [target.replace('mintblog@', 'mintblog:latest@')],
      [target, target],
    ]) {
      const result = spawnSync('bash', [script, ...args], {
        cwd: directory,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
      })
      assert.equal(result.status, 64, result.stderr)
      assert.match(result.stderr, /approved image digest/)
    }
    assert.deepEqual((await readdir(directory)).sort(), [
      '.env',
      'docker',
      'docker-compose.yml',
    ])
    assert.equal(await readFile(join(directory, '.env'), 'utf8'), oldEnv)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
