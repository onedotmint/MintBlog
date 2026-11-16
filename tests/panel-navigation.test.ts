import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const script = (path: string) => {
  const body = source(path).match(/<script\b[^>]*>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(body)
  return stripTypeScriptTypes(body.replace(/^\s*import[\s\S]*?from\s*['"][^'"]+['"];?/gm, ''))
}

test('mobile navigation keeps static links until its enhancement is wired', () => {
  const navbar = source('src/components/nav/NavBar.astro')
  assert.match(navbar, /id="mobile-nav-fallback"/)
  assert.match(navbar, /internalNavs\.map[\s\S]*mergeOnMobile=\{false\}/)
  const nav = source('src/components/nav/NavSwitch.astro')
  assert.match(nav, /id="nav-open-button"\s+hidden/)
  assert.match(nav, /#nav-open-button\[hidden\]/)

  const calls: string[] = []
  let loaded = () => {}
  runInNewContext(script('src/components/nav/NavSwitch.astro'), {
    toggleFadeEffect: () => {},
    document: {
      addEventListener(_type: string, fn: () => void) { loaded = fn },
      getElementById(id: string) {
        return id === 'nav-open-button'
          ? {
              addEventListener: () => calls.push('wired'),
              removeAttribute: () => calls.push('show-button'),
            }
          : { classList: { add: () => calls.push('hide-fallback') } }
      },
    },
  })
  assert.deepEqual(calls, [], 'static links remain available before initialization')
  loaded()
  assert.deepEqual(calls, ['wired', 'show-button', 'hide-fallback'])
})

function panelHarness(panelId = 'nav-panel') {
  interface Key {
    key: string
    shiftKey?: boolean
    isComposing?: boolean
    preventDefault: () => void
  }
  const events = new Map<string, (event: Key) => void>()
  let active: unknown
  let open = true
  let prevented = 0
  let unlocked = 0
  let clickBackdrop = () => {}
  let clickClose = () => {}
  const calls: unknown[][] = []
  const first = { tabIndex: 0, focus: () => { active = first }, getClientRects: () => [1] }
  const last = { tabIndex: 0, focus: () => { active = last }, getClientRects: () => [1] }
  const panel = {
    id: panelId,
    inert: false,
    classList: { contains: () => !open },
    contains: (node: unknown) => node === first || node === last || node === panel,
    focus: () => { active = panel },
    querySelectorAll: () => [first, last, { tabIndex: -1, getClientRects: () => [1] }],
  }
  runInNewContext(script('src/components/base/Backdrop.astro'), {
    toggleFadeEffect: (...args: unknown[]) => {
      calls.push(args)
      open = false
    },
    finishPendingFadeEffects: () => {},
    unlockScroll: () => { unlocked++ },
    document: {
      get activeElement() { return active },
      querySelectorAll: (selector: string) => {
        assert.equal(selector, '[data-panel-close]')
        return [{ addEventListener: (_type: string, fn: () => void) => { clickClose = fn } }]
      },
      addEventListener: (type: string, fn: (event: Key) => void) => events.set(type, fn),
      getElementById: (id: string) => id === panel.id ? panel : id === 'backdrop' ? {
        addEventListener: (_type: string, fn: () => void) => { clickBackdrop = fn },
      } : null,
    },
  })
  const key = (key: string, shiftKey = false, isComposing = false) => {
    events.get('keydown')?.({ key, shiftKey, isComposing, preventDefault: () => { prevented++ } })
  }
  return {
    first, last, panel, events, calls, key,
    focus: (node: unknown) => { active = node },
    active: () => active,
    prevented: () => prevented,
    unlocked: () => unlocked,
    clickBackdrop: () => clickBackdrop(),
    clickClose: () => clickClose(),
  }
}

test('modal Tab navigation wraps in both directions, including focus outside the panel', () => {
  const env = panelHarness()
  env.focus(env.last)
  env.key('Tab')
  assert.equal(env.active(), env.first)
  env.key('Tab', true)
  assert.equal(env.active(), env.last)
  env.focus(null)
  env.key('Tab')
  assert.equal(env.active(), env.first)
  assert.equal(env.prevented(), 3)
})

test('Escape respects IME and closes the panel with its backdrop otherwise', () => {
  const env = panelHarness()
  env.key('Escape', false, true)
  assert.equal(env.calls.length, 0)
  env.key('Escape')
  assert.deepEqual(env.calls, [
    ['nav-panel', false, 'hidden!'],
    ['backdrop', false, 'hidden'],
  ])
  env.key('Escape')
  assert.equal(env.calls.length, 2)
})

test('backdrop click closes the modal and navigation releases the old scroll lock', () => {
  const env = panelHarness()
  const event = { key: '', preventDefault() {} }
  env.events.get('astro:page-load')?.(event)
  env.clickBackdrop()
  assert.equal(env.calls.length, 2)
  env.events.get('astro:before-swap')?.(event)
  assert.equal(env.unlocked(), 1)
})

test('every modal has a named close button that dismisses the panel and backdrop', () => {
  const panels = [
    ['nav-panel', 'src/components/nav/NavSwitch.astro', 'hidden!'],
    ['toc-panel', 'src/components/toc/TocPanel.astro', 'hidden!'],
    ['tag-panel', 'src/components/tags/TagPanel.astro', 'hidden!'],
    ['search-panel', 'src/components/widgets/SearchSwitch.astro', 'hidden'],
  ]
  for (const [id, path, hiddenClass] of panels) {
    const markup = source(path)
    const closeButton = markup.match(/<button\b[^>]*\bdata-panel-close[^>]*>[\s\S]*?<\/button>/)?.[0]
    assert.ok(closeButton, `${id} needs a close button inside its dialog`)
    assert.ok(markup.indexOf(closeButton) > markup.indexOf(`id="${id}"`))
    assert.match(closeButton, /type="button"/)
    assert.match(closeButton, /aria-label="[^"]+"/)

    const env = panelHarness(id)
    env.events.get('astro:page-load')?.({ key: '', preventDefault() {} })
    env.clickClose()
    assert.deepEqual(env.calls, [
      [id, false, hiddenClass],
      ['backdrop', false, 'hidden'],
    ])
    env.clickClose()
    assert.equal(env.calls.length, 2, 'closing an already closed dialog is harmless')
  }
})
