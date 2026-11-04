import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { test } from 'node:test'
import { ESLint, Linter } from 'eslint'

const requireProject = createRequire(import.meta.url)
const requireESLint = createRequire(requireProject.resolve('eslint'))
const requireParser = createRequire(
  requireProject.resolve('@typescript-eslint/parser'),
)
const consumers = [
  ['ESLint', requireProject.resolve('eslint')],
  ['config-array', requireESLint.resolve('@eslint/config-array')],
  [
    'typescript-estree',
    requireParser.resolve('@typescript-eslint/typescript-estree'),
  ],
  ['jsx-a11y-x', requireProject.resolve('eslint-plugin-jsx-a11y-x')],
]

for (const [name, entry] of consumers) {
  test(`${name} resolves patched minimatch and retains matching APIs`, () => {
    const requireConsumer = createRequire(entry)
    assert.equal(requireConsumer('minimatch/package.json').version, '11.0.1')
    const { Minimatch, minimatch } = requireConsumer('minimatch')
    const matcher = new Minimatch('src/**/*.{ts,astro}', { dot: true })
    assert.equal(matcher.pattern, 'src/**/*.{ts,astro}')
    assert.equal(matcher.match('src/utils', true), true)
    assert.equal(matcher.match('scripts', true), false)
    assert.equal(matcher.match('src/.hidden/probe.ts'), true)
    assert.equal(matcher.match('src/views/probe.astro'), true)
    assert.equal(matcher.match('src/views/probe.md'), false)
    assert.equal(matcher.match('scripts/probe.ts'), false)
    const unignore = new Minimatch('!src/keep/**', {
      dot: true,
      flipNegate: true,
    })
    assert.equal(unignore.match('src/keep/probe.ts'), true)
    assert.equal(unignore.match('src/drop/probe.ts'), false)
    // Models ts-estree's allowDefaultProject matching, not a project-service integration test.
    assert.equal(minimatch('.config.ts', '*.ts', { dot: true }), true)
    assert.equal(minimatch('src/probe.ts', '*.ts', { dot: true }), false)
  })
}

test('Windows path matching accepts separators without broadening the scope', () => {
  const { Minimatch } = requireESLint('minimatch')
  // shortcut: simulates minimatch's Windows mode, use Windows CI to verify ESLint's host-path handling.
  for (const [pattern, file] of [
    ['src/**/*.{ts,astro}', 'src\\utils\\probe.ts'],
    ['C:/repo/src/**/*.ts', 'C:\\repo\\src\\utils\\probe.ts'],
    ['//server/share/src/**/*.ts', '\\\\server\\share\\src\\utils\\probe.ts'],
  ]) {
    const matcher = new Minimatch(pattern, { dot: true, platform: 'win32' })
    assert.equal(matcher.match(file), true, file)
    assert.equal(
      matcher.match(file.replace('probe.ts', 'probe.md')),
      false,
      file,
    )
  }
  const joinedPattern = new Minimatch('C:\\repo\\src\\**\\*.ts', {
    platform: 'win32',
    windowsPathsNoEscape: true,
  })
  assert.equal(joinedPattern.match('C:\\repo\\src\\utils\\probe.ts'), true)
})

test('ESLint traverses brace globs and parses real production files', async () => {
  const eslint = new ESLint({ cache: false })
  const files = [
    'src/utils/datetime.ts',
    'src/utils/path.ts',
    'src/components/views/GroupView.astro',
    'scripts/build-search.mjs',
    'tests/check-boundaries.test.ts',
    'astro.config.ts',
  ]
  const results = await eslint.lintFiles([
    'src/utils/{datetime,path}.ts',
    ...files.slice(2),
  ])
  assert.deepEqual(
    results
      .map((result) =>
        path.relative(process.cwd(), result.filePath).split(path.sep).join('/'),
      )
      .sort(),
    [...files].sort(),
  )
  for (const result of results)
    assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages))

  for (const ignored of [
    '.astro/probe.ts',
    'dist/probe.ts',
    'node_modules/probe.ts',
    '.local/probe.ts',
  ])
    assert.equal(await eslint.isPathIgnored(ignored), true, ignored)
  assert.equal(await eslint.isPathIgnored('src/local/probe.ts'), false)
  // check-boundaries.test.ts additionally asserts production coverage and real TS/JS rule violations.
})

test('a11y component globs still detect missing labels and accept labelled controls', () => {
  const linter = new Linter()
  const jsxA11y = requireProject('eslint-plugin-jsx-a11y-x').default
  const config: Linter.Config = {
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'jsx-a11y-x': jsxA11y },
    rules: {
      'jsx-a11y-x/label-has-associated-control': [
        'error',
        {
          labelComponents: ['Ui*Label'],
          controlComponents: ['Ui*Input'],
          assert: 'nesting',
        },
      ],
    },
  }
  assert.deepEqual(
    linter.verify('<UiFormLabel>Name<UiTextInput /></UiFormLabel>', config),
    [],
  )
  const messages = linter.verify(
    '<UiFormLabel><UiTextInput /></UiFormLabel>',
    config,
  )
  assert.equal(messages.length, 1)
  assert.equal(messages[0].ruleId, 'jsx-a11y-x/label-has-associated-control')
  assert.match(messages[0].message, /accessible text/)
})
