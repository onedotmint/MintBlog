import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

const requireKatex = createRequire(import.meta.resolve('rehype-katex'))
const katex = requireKatex('katex')

test('patched KaTeX renders inline/block math through the existing plugins and keeps unsafe links untrusted', async () => {
  assert.equal(katex.version, '0.18.10')
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  })
  const rendered = await processor.render(
    '行内公式 $x^2 + y^2 = z^2$。\n\n$$\n\\frac{1}{2} + \\sqrt{4}\n$$\n',
  )
  assert.match(rendered.code, /class="katex"/)
  assert.match(rendered.code, /class="katex-display"/)
  assert.match(rendered.code, /<math/)
  assert.doesNotMatch(rendered.code, /katex-error/)
  const unsafe = await processor.render(
    '$\\href{javascript:alert(1)}{do not execute}$',
  )
  assert.doesNotMatch(unsafe.code, /<a\b[^>]*href=/)
  const malformed = await processor.render('$\\frac{$')
  assert.match(malformed.code, /katex-error/)
  const css = readFileSync(
    new URL('../src/styles/markdown.css', import.meta.url),
    'utf8',
  )
  assert.ok(css.includes("@import 'katex/dist/katex.min.css'"))
  assert.doesNotMatch(css, /cdn\.jsdelivr\.net\/npm\/katex/)
})

test('local, CI and container tool versions stay aligned and audit includes build dependencies', () => {
  for (const file of ['.nvmrc', '.node-version'])
    assert.equal(
      readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').trim(),
      '24.22.1',
    )
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  )
  assert.equal(manifest.packageManager, 'pnpm@10.34.7')
  const docker = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8')
  assert.match(
    docker,
    /FROM node:24\.22\.1-bookworm-slim@sha256:[a-f0-9]{64} AS build/,
  )
  assert.match(docker, /corepack prepare pnpm@10\.34\.7 --activate/)
  assert.match(
    docker,
    /FROM nginx:1\.30\.6-alpine@sha256:[a-f0-9]{64} AS runtime/,
  )
  const ci = readFileSync(
    new URL('../.github/workflows/deploy.yml', import.meta.url),
    'utf8',
  )
  assert.match(ci, /NODE_VERSION: '24\.22\.1'/)
  assert.match(ci, /PNPM_VERSION: '10\.34\.7'/)
  assert.match(ci, /run: pnpm audit\s*\n/)
  assert.doesNotMatch(
    ci,
    /pnpm audit --prod|audit-level|ignore-advisories|continue-on-error/,
  )
})

test('CI only validates and publishes versioned images without server access', () => {
  const ci = readFileSync(
    new URL('../.github/workflows/deploy.yml', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(ci, /^ {2}deploy:|DEPLOY_|\bssh\b|type=raw,value=latest/m)
  assert.match(ci, /type=sha,format=long,prefix=sha-/)
  assert.match(ci, /needs: validate/)
  assert.ok(
    ci.includes(
      "if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'",
    ),
  )
  assert.ok(ci.includes('group: mintblog-${{ github.ref }}'))
  assert.ok(
    ci.includes(
      "cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
    ),
  )
})

test('workflow pins verified Node 24 Actions with exact version labels and a stable runner', () => {
  const ci = readFileSync(
    new URL('../.github/workflows/deploy.yml', import.meta.url),
    'utf8',
  )
  // These releases declare runs.using: node24 in their upstream action.yml.
  const versions = new Map([
    ['actions/checkout', 'v7.0.1'],
    ['actions/setup-node', 'v7.1.0'],
    ['pnpm/action-setup', 'v6.1.1'],
    ['docker/setup-buildx-action', 'v4.4.1'],
    ['docker/login-action', 'v4.7.0'],
    ['docker/metadata-action', 'v6.2.0'],
    ['docker/build-push-action', 'v7.4.0'],
  ])
  const actions = [
    ...ci.matchAll(/^\s+uses: ([\w/-]+)@([a-f0-9]{40}) # (v\d+\.\d+\.\d+)$/gm),
  ]
  assert.equal(actions.length, [...ci.matchAll(/^\s+uses:/gm)].length)
  assert.equal(new Set(actions.map(([, name]) => name)).size, versions.size)
  for (const [, name, sha, version] of actions) {
    assert.equal(version, versions.get(name), name)
    assert.equal(sha.length, 40)
  }
  assert.equal([...ci.matchAll(/runs-on: ubuntu-24\.04/g)].length, 2)
  assert.doesNotMatch(
    ci,
    /ubuntu-latest|FORCE_JAVASCRIPT_ACTIONS_TO_NODE|ACTIONS_ALLOW_USE_UNSECURE_NODE/,
  )
})
