import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { z } from 'astro/zod'
import ts from 'typescript'

const readSource = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('post redirects accept only credential-free HTTP(S) URLs or an empty value', () => {
  const { outputText } = ts.transpileModule(readSource('src/schema.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  })
  const redirectSchema: z.ZodType<string> = runInNewContext(
    `${outputText}\nexports.postSchema({ image: () => require('astro/zod').z.string() }).shape.redirect`,
    {
      exports: {},
      URL,
      require(specifier: string) {
        if (specifier === 'astro/zod') return { z }
        // Content references are Astro virtual modules, unrelated to URL validation.
        if (specifier === 'astro:content') return { reference: () => z.string() }
        throw new Error(`Unexpected schema import: ${specifier}`)
      },
    }
  )

  assert.equal(redirectSchema.parse(undefined), '')
  for (const value of [
    '',
    'https://example.com/post?q=1#part',
    'http://example.com/',
  ])
    assert.equal(redirectSchema.parse(value), value)

  for (const value of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com/file',
    '//example.com/post',
    '/blog/post/',
    'https://user:password@example.com/',
    'https://user@example.com/',
    'not a URL',
  ])
    assert.equal(redirectSchema.safeParse(value).success, false, value)
})

test('both JSON-LD outputs preserve content without exposing HTML script delimiters', () => {
  const expressions = [
    ...readSource('src/components/base/Head.astro').matchAll(/set:html=\{([\s\S]*?)\}/g),
  ]
  assert.equal(expressions.length, 2)
  const payload = {
    title: '</script><script>alert(1)</script>',
    description: '<!-- 中文 <img src=x onerror=alert(1)> & "quotes"',
  }
  for (const [, expression] of expressions) {
    const serialized: string = runInNewContext(expression, {
      blogPostingData: payload,
      webPageData: payload,
    })
    assert.doesNotMatch(serialized, /</)
    assert.deepEqual(JSON.parse(serialized), payload)
  }
})

test('search subresult titles stay text while Pagefind excerpts keep highlighting', () => {
  const search = readSource('src/components/widgets/SearchSwitch.astro')
  assert.match(search, /title\.textContent\s*=\s*subResults\[s\]\.title/)
  assert.doesNotMatch(search, /\$\{subResults\[s\]\.title\}/)
  assert.match(search, /excerpt\.innerHTML\s*=\s*subResults\[s\]\.excerpt/)
  assert.match(search, /a\.append\(title, excerpt\)/)
})
