import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

const sha = 'a'.repeat(40)
const taggedImage = `ghcr.io/owner/mintblog:sha-${sha}`
const imageId = `sha256:${'b'.repeat(64)}`
const digest = `sha256:${'c'.repeat(64)}`
const pinnedImage = `ghcr.io/owner/mintblog@${digest}`

const mockDocker = String.raw`#!${process.execPath}
const fs = require('node:fs')
const args = process.argv.slice(2)
const scenario = process.env.SMOKE_SCENARIO
fs.appendFileSync('trace', 'docker ' + args.join(' ') + '\n')
switch (args[0] + ' ' + args[1]) {
  case 'image inspect':
    if (args.at(-1) !== '${taggedImage}') process.exit(1)
    console.log(scenario === 'tag-changed' && fs.existsSync('cleaned') ? 'different-image-id' : '${imageId}')
    break
  case 'run -d':
    if (args.at(-1) !== '${imageId}') process.exit(1)
    console.log('ci-container')
    break
  case 'inspect --format':
    console.log(scenario === 'unhealthy' ? 'running unhealthy' : 'running healthy')
    break
  case 'port ci-container': console.log('127.0.0.1:54321'); break
  case 'logs ci-container': break
  case 'rm -f': fs.writeFileSync('cleaned', ''); break
  case 'image push':
    if (args.at(-1) !== '${taggedImage}') process.exit(1)
    console.log('sha-${sha}: digest: ' + (scenario === 'bad-digest' ? 'invalid' : '${digest}') + ' size: 100')
    if (scenario === 'push-failed') process.exit(1)
    break
  default: process.exit(1)
}
`

const mockCurl = String.raw`#!${process.execPath}
const fs = require('node:fs')
const args = process.argv.slice(2)
const scenario = process.env.SMOKE_SCENARIO
const url = new URL(args.at(-1))
if (url.origin !== 'http://127.0.0.1:54321') process.exit(1)
const route = url.pathname
fs.appendFileSync('trace', 'curl ' + route + '\n')
const missing = route === '/__mintblog_smoke_missing__'
const status = missing ? (scenario === 'soft-404' ? 200 : 404) : (scenario === 'bad-route' && route === '/shorts/' ? 500 : 200)
const body = route === '/404.html' || (missing && scenario !== 'wrong-404-body') ? 'Custom 404 page' : 'Other content'
fs.writeFileSync(args[args.indexOf('--output') + 1], body)
process.stdout.write(String(status))
`

for (const scenario of [
  'success',
  'unhealthy',
  'bad-route',
  'soft-404',
  'wrong-404-body',
  'tag-changed',
  'push-failed',
  'bad-digest',
]) {
  test(`CI checks and publishes the same Docker image: ${scenario} (mocked)`, async () => {
    const workflow = await readFile(
      new URL('../.github/workflows/deploy.yml', import.meta.url),
      'utf8',
    )
    const build = workflow.match(
      /- name: Build and load image\n([\s\S]+?)\n\s*- name: Smoke-test and publish/,
    )
    assert.match(build?.[1] ?? '', /^\s+load: true$/m)
    assert.doesNotMatch(workflow, /^\s+push: true$/m)
    // Execute the workflow's actual Bash block with mocked Docker and HTTP.
    const step = workflow.match(
      /- name: Smoke-test and publish the loaded image\n[\s\S]+?run: \|\n((?:^ {10}[^\n]*\n)+)/m,
    )
    assert.ok(step)
    const directory = await mkdtemp(join(tmpdir(), 'mintblog-ci-'))
    try {
      await mkdir(join(directory, 'bin'))
      await mkdir(join(directory, 'docker'))
      await copyFile(
        new URL('../docker/smoke-test.sh', import.meta.url),
        join(directory, 'docker/smoke-test.sh'),
      )
      await writeFile(join(directory, 'bin/docker'), mockDocker, {
        mode: 0o700,
      })
      await writeFile(join(directory, 'bin/curl'), mockCurl, { mode: 0o700 })
      const summary = join(directory, 'summary')
      const result = spawnSync(
        'bash',
        ['-eo', 'pipefail', '-c', step[1].replace(/^ {10}/gm, '')],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${join(directory, 'bin')}:${process.env.PATH}`,
            TAGGED_IMAGE: taggedImage,
            GITHUB_SHA: sha,
            GITHUB_STEP_SUMMARY: summary,
            RUNNER_TEMP: directory,
            SMOKE_SCENARIO: scenario,
          },
        },
      )
      const trace = await readFile(join(directory, 'trace'), 'utf8')
      assert.ok(
        trace.includes(
          `docker run -d --pull never --health-interval 1s -p 127.0.0.1::80 ${imageId}\n`,
        ),
      )
      assert.match(trace, /docker rm -f ci-container/)
      if (scenario === 'success') {
        assert.equal(result.status, 0, result.stderr)
        assert.deepEqual(trace.match(/^curl .+$/gm), [
          'curl /',
          'curl /blog/',
          'curl /projects/',
          'curl /shorts/',
          'curl /rss.xml',
          'curl /sitemap-index.xml',
          'curl /404.html',
          'curl /__mintblog_smoke_missing__',
        ])
        assert.ok(
          trace.indexOf(`docker image push ${taggedImage}`) >
            trace.indexOf('docker rm -f ci-container'),
        )
        const published = await readFile(summary, 'utf8')
        assert.ok(
          published.includes(sha) &&
            published.includes(`bash deploy.sh ${pinnedImage}`),
        )
      } else {
        assert.notEqual(result.status, 0)
        assert.equal(
          trace.includes('docker image push '),
          ['push-failed', 'bad-digest'].includes(scenario),
        )
        await assert.rejects(readFile(summary), { code: 'ENOENT' })
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
}
