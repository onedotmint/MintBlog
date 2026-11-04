import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(
  new URL('../src/pages/robots.txt.ts', import.meta.url),
  'utf8',
)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
})

test('robots keeps public crawling and a site/base-aware sitemap without a plugin', async () => {
  for (const base of ['/', '/notes', '/notes/']) {
    const response: Response = runInNewContext(`${outputText}\nexports.GET()`, {
      exports: {},
      URL,
      Response,
      require: () => ({ SITE: { website: 'https://blog.example.com/', base } }),
    })
    const path = base === '/' ? '/' : '/notes/'
    assert.equal(
      response.headers.get('Content-Type'),
      'text/plain; charset=utf-8',
    )
    assert.equal(
      await response.text(),
      `User-agent: *\nAllow: /\nSitemap: https://blog.example.com${path}sitemap-index.xml\n`,
    )
  }
})
