import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

const nginxConf = readFileSync(
  new URL('../docker/nginx.conf', import.meta.url),
  'utf8',
)
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as {
  scripts: Record<string, string>
  'lint-staged': Record<string, string[]>
}

test('nginx disables absolute redirects and serves 404.html with 404 status', () => {
  const activeLines = nginxConf
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean)
    .join('\n')

  assert.match(activeLines, /\babsolute_redirect\s+off;/)
  assert.match(activeLines, /\berror_page\s+404\s+\/404\.html;/)
  assert.doesNotMatch(activeLines, /\berror_page\s+404\s+=\d*\s*\/404\.html;/)
  assert.match(activeLines, /try_files\s+\$uri\s+\$uri\/\s+=404;/)
  assert.ok(
    existsSync(new URL('../src/pages/404.mdx', import.meta.url)),
    'Expected src/pages/404.mdx to exist for /404.html',
  )
})

test('runtime health requires the built homepage, not the base image welcome page', () => {
  const dockerfile = readFileSync(
    new URL('../Dockerfile', import.meta.url),
    'utf8',
  )
  const compose = readFileSync(
    new URL('../docker-compose.yml', import.meta.url),
    'utf8',
  )
  assert.match(
    dockerfile,
    /^COPY --from=build \/app\/dist\/ \/srv\/mintblog\/$/m,
  )
  assert.match(nginxConf, /\broot \/srv\/mintblog;/)
  const health = nginxConf.match(/location = \/healthz \{([^}]+)\}/)?.[1] ?? ''
  assert.match(health, /try_files \/index\.html =503;/)
  assert.doesNotMatch(health, /\breturn\s+200\b/)
  assert.match(dockerfile, /HEALTHCHECK[^\n]*\n\s*CMD [^\n]*\/healthz/)
  assert.doesNotMatch(compose, /^\s+healthcheck:/m)
})

test('lint-staged only targets JS/TS/Astro files with strict eslint flags matching pnpm lint', () => {
  const lintStaged = packageJson['lint-staged']
  assert.ok(lintStaged && typeof lintStaged === 'object')
  assert.equal(Object.hasOwn(lintStaged, '*'), false)

  const expectedPattern = '*.{js,mjs,cjs,ts,tsx,mts,cts,astro}'
  assert.deepEqual(Object.keys(lintStaged), [expectedPattern])

  const commands = lintStaged[expectedPattern]
  assert.equal(commands.length, 1)
  assert.match(commands[0], /^eslint\b/)
  assert.match(commands[0], /--report-unused-disable-directives\b/)
  assert.match(commands[0], /--max-warnings\s+0\b/)

  assert.match(packageJson.scripts.lint, /--report-unused-disable-directives\b/)
  assert.match(packageJson.scripts.lint, /--max-warnings\s+0\b/)

  const eslintConfig = readFileSync(
    new URL('../eslint.config.mjs', import.meta.url),
    'utf8',
  )
  assert.ok(
    eslintConfig.includes('{js,mjs,cjs,ts,tsx,mts,cts,astro}'),
    'Expected lint-staged extensions to match eslint.config.mjs',
  )
})
