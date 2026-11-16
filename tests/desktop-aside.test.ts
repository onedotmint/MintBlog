import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const readSource = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('DesktopAside uses unique ids and shared data-desktop-aside across all branches', () => {
  const source = readSource('src/components/base/DesktopAside.astro')
  const asideTags = [...source.matchAll(/<aside\b([\s\S]*?)>/g)].map(
    (match) => match[1]
  )

  assert.equal(asideTags.length, 3)

  const ids = asideTags.map((attrs) => {
    assert.match(attrs, /\bdata-desktop-aside(?:\s|$|=)/)
    const idMatch = attrs.match(/\bid="([^"]+)"/)
    assert.ok(idMatch && idMatch[1], 'Every <aside> must define a non-empty id')
    return idMatch[1]
  })

  assert.equal(new Set(ids).size, ids.length)
})

test('main.css excludes all DesktopAside instances via data-desktop-aside instead of #desktop-aside', () => {
  const css = readSource('src/styles/main.css')

  assert.doesNotMatch(css, /:not\(#desktop-aside\)/)
  assert.match(
    css,
    /\.slide-enter-content\s*>\s*\*:not\(\[data-desktop-aside\]\):not\(#mobile-control\)/
  )
})
