import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'
import ecConfig from '../ec.config.mjs'

const require = createRequire(import.meta.resolve('astro-expressive-code'))
const { default: expressiveCode } = await import(
  require.resolve('rehype-expressive-code')
)
const processor = await createMarkdownProcessor({
  syntaxHighlight: false,
  rehypePlugins: [[expressiveCode, ecConfig]],
})

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('article scroll areas have bounded height, keyboard focus and an uncapped print layout', async () => {
  const css = await readSource('src/styles/markdown.css')
  assert.match(
    css,
    /\.prose \.expressive-code pre,\s*\.prose \.scroll-content\s*\{\s*max-height: 400px;\s*overflow: auto;\s*overscroll-behavior: contain;/,
  )
  assert.match(
    css,
    /\.prose \.expressive-code pre:focus-visible,\s*\.prose \.scroll-content:focus-visible\s*\{\s*outline: 2px solid var\(--fg-light\);/,
  )
  assert.match(
    css,
    /@media print\s*\{\s*\.prose \.expressive-code pre,\s*\.prose \.scroll-content\s*\{\s*max-height: none;\s*overflow: visible;/,
  )
})

test('documented code and text folds render as native details with accessible scroll areas', async () => {
  const guide = await readSource('docs/content-guide.md')
  const examples = [...guide.matchAll(/^(`{3,4})md\n(<details>[\s\S]*?)^\1$/gm)]
  assert.equal(examples.length, 2)

  const { code } = await processor.render(examples[0][2])
  assert.match(code, /<details>\s*<summary>展开完整代码<\/summary>/)
  assert.match(code, /class="expressive-code"/)
  assert.match(
    code,
    /<pre[^>]*tabindex="0"[^>]*role="region"[^>]*aria-label="代码（可滚动）"/,
  )
  assert.match(code, /class="title">example\.js<\/span>/)
  assert.match(code, /<button[^>]*data-code=/)
  assert.doesNotMatch(code, /```|<details open/)

  const { code: text } = await processor.render(examples[1][2])
  assert.match(text, /<details>\s*<summary>展开补充说明<\/summary>/)
  assert.match(
    text,
    /<div class="scroll-content" tabindex="0" role="region" aria-label="补充说明">/,
  )
  assert.match(text, /<strong>加粗<\/strong>/)
  assert.match(text, /<li>第一项<\/li>/)
  assert.doesNotMatch(text, /<script|<details open/)
})

test('long code keeps every line, copy content and existing line-range folding', async () => {
  const lines = Array.from(
    { length: 80 },
    (_, index) => `console.log(${index + 1})`,
  )
  const { code } = await processor.render(
    ['```js collapse={5-30}', ...lines, '```'].join('\n'),
  )
  assert.equal((code.match(/class="ec-line"/g) ?? []).length, 81)
  assert.match(code, /class="ec-section collapsible-start"/)
  assert.match(code, /26 collapsed lines/)
  assert.match(code, /data-code="console\.log\(1\)[^"]*console\.log\(80\)"/)
  assert.match(code, /<pre[^>]*tabindex="0"/)
})
