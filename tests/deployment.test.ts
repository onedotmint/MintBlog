import assert from 'node:assert/strict'
import {
  chmod,
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
const target = `ghcr.io/owner/mintblog:sha-${'b'.repeat(40)}`
const previous = `sha256:${'a'.repeat(64)}`

const mockDocker = `#!${process.execPath}
const fs = require('node:fs')
const args = process.argv.slice(2)
const scenario = process.env.DEPLOY_SCENARIO
fs.appendFileSync(process.env.DOCKER_LOG, JSON.stringify({ args, image: process.env.BLOG_IMAGE }) + '\\n')
if (args[0] === 'compose' && args[1] === 'config') console.log(scenario === 'invalid-repository' ? 'ghcr.io/owner/nested/repository:tag' : scenario === 'fixed-image' ? 'ghcr.io/owner/mintblog:fixed' : process.env.BLOG_IMAGE || 'ghcr.io/owner/mintblog:bootstrap')
if (args[0] === 'inspect') console.log('${previous}')
if (args[0] === 'compose' && args[1] === 'ps' && scenario !== 'first-failure') console.log('old-container')
if (args[0] === 'compose' && args[1] === 'pull' && scenario === 'pull-failure') process.exit(1)
if (args[0] === 'compose' && args[1] === 'up' && ['start-failure', 'first-failure', 'rollback-failure'].includes(scenario)) {
  if (process.env.BLOG_IMAGE === '${target}' || scenario === 'rollback-failure') process.exit(1)
}
`

const mockCurl =
  `#!` +
  process.execPath +
  String.raw`
const fs = require('node:fs')
const scenario = process.env.DEPLOY_SCENARIO
const url = process.argv.at(-1)
fs.appendFileSync(process.env.CURL_LOG, url + '\n')
if (scenario === 'api-failure') process.exit(22)
if (url.includes('/jobs?')) {
  console.log(JSON.stringify({ jobs: [{ name: 'Build and publish image', status: 'completed', conclusion: scenario === 'publish-skipped' ? 'skipped' : 'success' }] }))
} else {
  const run = { id: scenario === 'malformed-run' ? '../invalid' : 42, head_sha: scenario === 'malformed-sha' ? 'not-a-sha' : 'b'.repeat(40), head_branch: 'main', status: 'completed', conclusion: 'success', event: 'push', head_repository: { full_name: 'Owner/MintBlog' } }
  console.log(JSON.stringify({ workflow_runs: scenario === 'empty-runs' ? [] : [
    { ...run, event: 'pull_request', head_sha: 'c'.repeat(40) },
    { ...run, head_branch: 'feature', head_sha: 'c'.repeat(40) },
    { ...run, head_repository: { full_name: 'Other/MintBlog' }, head_sha: 'c'.repeat(40) },
    { ...run, conclusion: 'failure', head_sha: 'c'.repeat(40) },
    { ...run, event: 'workflow_dispatch' },
  ] }))
}
`

const selectionFailures = [
  'api-failure',
  'empty-runs',
  'publish-skipped',
  'malformed-sha',
  'malformed-run',
  'invalid-repository',
  'fixed-image',
]

interface DockerCall {
  args: string[]
  image: string
}

for (const automatic of [false, true]) {
  for (const scenario of [
    'success',
    'locked',
    'pull-failure',
    'start-failure',
    'first-failure',
    'rollback-failure',
    'save-failure',
  ...(!automatic ? ['fixed-image'] : []),
    ...(automatic ? selectionFailures : []),
  ]) {
    test(`${automatic ? 'automatic' : 'pinned'} deployment handles ${scenario} without network or server access`, async () => {
      const directory = await mkdtemp(join(tmpdir(), 'mintblog-deploy-'))
      try {
        await writeFile(join(directory, 'docker-compose.yml'), 'services: {}\n')
        const envContents =
          '# Server settings\nBLOG_IMAGE=previous-version\nMINTBLOG_PROXY_NETWORK=proxy\nOTHER="keep me"\nexport BLOG_IMAGE = duplicate-version\n'
        await writeFile(join(directory, '.env'), envContents, { mode: 0o640 })
        const docker = join(directory, 'docker')
        await writeFile(docker, mockDocker)
        await chmod(docker, 0o700)
        const curl = join(directory, 'curl')
        await writeFile(curl, mockCurl)
        await chmod(curl, 0o700)
        if (scenario === 'save-failure') {
          const mv = join(directory, 'mv')
          await writeFile(mv, '#!/bin/sh\nexit 1\n')
          await chmod(mv, 0o700)
        }
        const curlLog = join(directory, 'curl.log')
        const args = automatic ? [] : [target]
        const log = join(directory, 'docker.log')
        const result = spawnSync(
          scenario === 'locked' ? 'flock' : 'bash',
          scenario === 'locked'
            ? ['.mintblog-deploy.lock', 'bash', script, ...args]
            : [script, ...args],
          {
            cwd: directory,
            encoding: 'utf8',
            env: {
              ...process.env,
              PATH: `${directory}:${process.env.PATH}`,
              DOCKER_LOG: log,
              CURL_LOG: curlLog,
              DEPLOY_SCENARIO: scenario,
            },
          },
        )
        if (scenario === 'success')
          assert.equal(result.status, 0, result.stderr)
        else assert.notEqual(result.status, 0, result.stderr)
        assert.equal(
          (await readdir(directory)).some((name) => name.startsWith('.env.')),
          false,
        )
        assert.equal((await stat(join(directory, '.env'))).mode & 0o777, 0o640)
        const savedEnv = await readFile(join(directory, '.env'), 'utf8')
        assert.equal(
          savedEnv,
          scenario === 'success'
            ? '# Server settings\nMINTBLOG_PROXY_NETWORK=proxy\nOTHER="keep me"\nBLOG_IMAGE=' +
                target +
                '\n'
            : envContents,
        )
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
        if (selectionFailures.includes(scenario)) {
          assert.ok(calls.every(({ args }) => args[1] === 'config'))
          return
        }
        if (automatic) {
          const urls = (await readFile(curlLog, 'utf8')).trim().split('\n')
          assert.equal(
            urls[0],
            'https://api.github.com/repos/owner/mintblog/actions/workflows/deploy.yml/runs?branch=main&status=success&per_page=100',
          )
          assert.equal(
            urls[1],
            'https://api.github.com/repos/owner/mintblog/actions/runs/42/jobs?per_page=100',
          )
        } else {
          await assert.rejects(readFile(curlLog), { code: 'ENOENT' })
        }
        assert.ok(calls.some(({ args }) => args[1] === 'pull'))

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
          assert.match(result.stdout, /Saved the running image in .env/)
        } else {
          assert.equal(starts.length, 2)
          assert.equal(starts[1].image, previous)
          assert.match(
            result.stderr,
            scenario === 'rollback-failure'
              ? /Rollback failed/
              : /Previous image is healthy/,
          )
        }
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    })
  }
}

test('deployment refuses mutable, empty or malformed explicit versions before Docker', () => {
  for (const args of [
    [''],
    ['ghcr.io/owner/mintblog:latest'],
    ['not-an-image'],
    [target, target],
  ]) {
    const result = spawnSync('bash', [script, ...args], { encoding: 'utf8' })
    assert.equal(result.status, 64, result.stderr)
    assert.match(result.stderr, /Usage:/)
  }
})

for (const linked of [false, true]) {
  test(
    linked
      ? 'deployment refuses a symlink .env before touching Docker'
      : 'first pinned deployment creates private defaults without requiring .env',
    async () => {
      const directory = await mkdtemp(join(tmpdir(), 'mintblog-deploy-env-'))
      try {
        await writeFile(join(directory, 'compose.yaml'), 'services: {}\n')
        const docker = join(directory, 'docker')
        await writeFile(docker, mockDocker)
        await chmod(docker, 0o700)
        if (linked) {
          await writeFile(join(directory, 'settings'), 'BLOG_IMAGE=original\n')
          await symlink('settings', join(directory, '.env'))
        }
        const log = join(directory, 'docker.log')
        const result = spawnSync('bash', [script, target], {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: directory + ':' + process.env.PATH,
            DOCKER_LOG: log,
            DEPLOY_SCENARIO: 'success',
          },
        })
        assert.equal(result.status, linked ? 1 : 0, result.stderr)
        if (linked) {
          assert.match(result.stderr, /symlink/)
          assert.equal(
            await readFile(join(directory, 'settings'), 'utf8'),
            'BLOG_IMAGE=original\n',
          )
          await assert.rejects(readFile(log), { code: 'ENOENT' })
        } else {
          assert.equal(
            await readFile(join(directory, '.env'), 'utf8'),
            'BLOG_IMAGE=' + target + '\n',
          )
          assert.equal(
            (await stat(join(directory, '.env'))).mode & 0o777,
            0o600,
          )
        }
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    },
  )
}
