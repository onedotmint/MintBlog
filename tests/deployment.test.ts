import assert from 'node:assert/strict'
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const script = fileURLToPath(new URL('../scripts/deploy.sh', import.meta.url))
const target = `ghcr.io/owner/mintblog:sha-${'b'.repeat(40)}`
const previous = `sha256:${'a'.repeat(64)}`

const mockDocker = `#!${process.execPath}
const fs = require('node:fs')
const args = process.argv.slice(2)
const scenario = process.env.DEPLOY_SCENARIO
fs.appendFileSync(process.env.DOCKER_LOG, JSON.stringify({ args, image: process.env.BLOG_IMAGE }) + '\\n')
if (args[0] === 'inspect') console.log('${previous}')
if (args[0] === 'compose' && args[1] === 'ps' && scenario !== 'first-failure') console.log('old-container')
if (args[0] === 'compose' && args[1] === 'pull' && scenario === 'pull-failure') process.exit(1)
if (args[0] === 'compose' && args[1] === 'up' && scenario.endsWith('failure')) {
  if (process.env.BLOG_IMAGE === '${target}' || scenario === 'rollback-failure') process.exit(1)
}
`

interface DockerCall {
  args: string[]
  image: string
}

for (const scenario of [
  'success',
  'locked',
  'pull-failure',
  'start-failure',
  'first-failure',
  'rollback-failure',
]) {
  test(`manual deployment handles ${scenario} without real Docker or server access`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mintblog-deploy-'))
    try {
      await writeFile(join(directory, 'docker-compose.yml'), 'services: {}\n')
      const envContents = 'BLOG_IMAGE=previous-version\nMINTBLOG_PROXY_NETWORK=proxy\n'
      await writeFile(join(directory, '.env'), envContents)
      const docker = join(directory, 'docker')
      await writeFile(docker, mockDocker)
      await chmod(docker, 0o700)
      const log = join(directory, 'docker.log')
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
            DOCKER_LOG: log,
            DEPLOY_SCENARIO: scenario,
          },
        }
      )
      assert.equal(result.status, scenario === 'success' ? 0 : 1, result.stderr)
      if (scenario === 'locked') {
        assert.match(result.stderr, /already running/)
        await assert.rejects(readFile(log), { code: 'ENOENT' })
        return
      }
      const calls: DockerCall[] = (await readFile(log, 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
      const starts = calls.filter(({ args }) => args[1] === 'up')
      assert.ok(calls.some(({ args }) => args[1] === 'pull'))
      assert.equal(await readFile(join(directory, '.env'), 'utf8'), envContents)

      if (scenario === 'pull-failure') {
        assert.equal(starts.length, 0)
        assert.ok(!calls.some(({ args }) => args[1] === 'stop'))
        return
      }
      assert.equal(starts[0].image, target)
      for (const { args } of starts) {
        assert.ok(args.includes('--wait'))
        assert.ok(args.includes('--pull') && args.includes('never'))
      }
      if (scenario === 'first-failure') {
        assert.equal(starts.length, 1)
        assert.ok(calls.some(({ args }) => args[1] === 'stop'))
      } else if (scenario === 'success') {
        assert.equal(starts.length, 1)
        assert.match(result.stdout, /does not edit .env/)
      } else {
        assert.equal(starts.length, 2)
        assert.equal(starts[1].image, previous)
        assert.match(
          result.stderr,
          scenario === 'rollback-failure'
            ? /Rollback failed/
            : /Previous image is healthy/
        )
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
}

test('manual deployment refuses missing, mutable or malformed image versions before Docker', () => {
  for (const args of [
    [],
    ['ghcr.io/owner/mintblog:latest'],
    ['not-an-image'],
    [target, target],
  ]) {
    const result = spawnSync('bash', [script, ...args], { encoding: 'utf8' })
    assert.equal(result.status, 64, result.stderr)
    assert.match(result.stderr, /Usage:/)
  }
})
