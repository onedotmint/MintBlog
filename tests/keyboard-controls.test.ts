import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('mobile-only controls are removed from desktop layout, not just transparent', () => {
  for (const file of ['toc/TocButton', 'tags/TagButton']) {
    const source = read(`src/components/${file}.astro`)
    assert.match(source, /lgp:hidden/)
    assert.match(source, /type="button"/)
    assert.match(source, /aria-label="[^"]+"/)
  }
})

test('sidebars reveal for keyboard focus and skip targets remain focusable', () => {
  for (const [file, id] of [
    ['toc/TocSidebar', 'skip-toc'],
    ['tags/TagSidebar', 'skip-tags'],
  ]) {
    const source = read(`src/components/${file}.astro`)
    assert.match(source, /focus-within:op-60/)
    const target = source.match(
      new RegExp(`<div\\b[^>]*\\sid="${id}"[^>]*>`),
    )?.[0]
    assert.ok(target)
    assert.match(target, /class="[^"]*\bsr-only\b[^"]*"/)
    assert.match(target, /tabindex="-1"/)
    assert.doesNotMatch(source, /top-1\.5 op-20/)
  }
  assert.doesNotMatch(read('src/layouts/BaseLayout.astro'), /top-1\.5 op-20/)
})

test('the search input has its own visible keyboard focus outline', () => {
  assert.match(
    read('src/components/widgets/SearchSwitch.astro'),
    /#search-input:focus-visible\s*\{\s*outline: 2px solid currentColor;/,
  )
})

test('return-to-top visibility is refreshed on navigation and resizing', () => {
  const source = read('src/components/widgets/ToTopButton.astro')
  assert.match(source, /invisible op-0/)
  assert.match(source, /lt-lgp:\(visible!/)
  assert.match(read('unocss.config.ts'), /lgp: '1128px'/)
  const script = source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(script)
  const events = new Map<string, () => void>()
  const style = { visibility: '', opacity: '', pointerEvents: '' }
  let desktop = true
  const win = {
    scrollY: 400,
    matchMedia: (query: string) => {
      assert.equal(query, '(min-width: 1128px)')
      return { matches: desktop }
    },
    scrollTo: () => {},
    addEventListener: (type: string, fn: () => void) => events.set(type, fn),
  }
  runInNewContext(stripTypeScriptTypes(script), {
    window: win,
    document: {
      documentElement: { scrollTop: 0 },
      addEventListener: (type: string, fn: () => void) => events.set(type, fn),
      getElementById: () => ({ style, addEventListener() {} }),
    },
  })
  events.get('astro:page-load')?.()
  assert.equal(style.visibility, 'visible')
  win.scrollY = 0
  events.get('astro:page-load')?.()
  assert.equal(style.visibility, 'hidden')
  win.scrollY = 301
  events.get('resize')?.()
  assert.equal(style.visibility, 'visible')
  desktop = false
  win.scrollY = 0
  events.get('scroll')?.()
  assert.equal(
    style.visibility,
    'visible',
    'mobile appearance stays controlled by responsive CSS',
  )
})
