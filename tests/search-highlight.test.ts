import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const scripts = (() => {
  const source = readFileSync(
    new URL('../src/components/widgets/SearchSwitch.astro', import.meta.url),
    'utf8',
  )
  const tags = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  const inline = tags.find(([, attrs]) =>
    attrs.includes('/pagefind/pagefind-highlight.js'),
  )?.[2]
  const listener = tags.find(
    ([, attrs, body]) =>
      !attrs.includes('is:inline') &&
      body.includes('astro:page-load') &&
      body.includes('highlight()'),
  )?.[2]
  assert.ok(inline && listener, 'missing SearchSwitch highlight scripts')
  const runnableInline = inline.replace(/\bimport\(([^)]+)\)/g, '__import($1)')
  assert.notEqual(runnableInline, inline)
  return { runnableInline, runnableListener: stripTypeScriptTypes(listener) }
})()

interface HighlightWindow {
  PagefindHighlight?: new () => { highlight: () => void }
  pagefindHighlight?: { highlight: () => void }
  pagefindHighlightPromise?: Promise<unknown>
  __pagefindHighlightListenerBound?: boolean
}

function createHighlightEnv(importImpl: (url: string) => Promise<unknown>) {
  const win: HighlightWindow = {}
  const listeners: Array<() => unknown> = []
  const loc = {
    href: 'https://example.com/posts/a/?search=mint',
    search: '?search=mint',
  }
  const importCalls: string[] = []
  const highlights: string[] = []
  const ctx = {
    window: win,
    document: {
      addEventListener(type: string, fn: () => unknown) {
        if (type === 'astro:page-load') listeners.push(fn)
      },
    },
    location: loc,
    URLSearchParams,
    scriptUrl: '/pagefind/pagefind-highlight.js',
    __import: (url: string) => {
      importCalls.push(url)
      return importImpl(url)
    },
  }
  const runInline = () => runInNewContext(scripts.runnableInline, ctx)
  const runListener = () => runInNewContext(scripts.runnableListener, ctx)
  return {
    window: win,
    listeners,
    importCalls,
    highlights,
    boot: () => {
      runInline()
      runListener()
      return win.pagefindHighlightPromise
    },
    runInline,
    runListener,
    navigate: (path: string, search = '') => {
      loc.href = `https://example.com${path}${search}`
      loc.search = search
    },
    enableHighlight: () => {
      win.PagefindHighlight = class {
        highlight() {
          highlights.push(loc.search)
        }
      }
    },
    dispatchPageLoad: () => Promise.all(listeners.map((fn) => fn())),
  }
}

test('delayed import resolves first ?search= highlight', async () => {
  const pending = deferred<void>()
  const env = createHighlightEnv(() => pending.promise)
  const init = env.boot()
  const pageLoad = env.dispatchPageLoad()
  await Promise.resolve()

  assert.deepEqual(env.importCalls, ['/pagefind/pagefind-highlight.js'])
  assert.deepEqual(env.highlights, [])
  env.enableHighlight()
  pending.resolve()
  assert.ok(await init)
  await pageLoad
  assert.deepEqual(env.highlights, ['?search=mint'])
  assert.ok(env.window.pagefindHighlight)
})

test('repeated scripts skip duplicate load/listen and keep working', async () => {
  const pending = deferred<void>()
  const env = createHighlightEnv(() => pending.promise)
  const init = env.boot()
  env.runInline()
  env.runListener()
  assert.deepEqual([env.importCalls.length, env.listeners.length], [1, 1])

  env.enableHighlight()
  pending.resolve()
  assert.ok(await init)
  await env.dispatchPageLoad()
  env.runInline()
  env.runListener()
  assert.deepEqual([env.importCalls.length, env.listeners.length], [1, 1])

  env.navigate('/posts/b/', '?search=astro')
  await env.dispatchPageLoad()
  env.navigate('/posts/c/')
  await env.dispatchPageLoad()
  assert.deepEqual(env.highlights, ['?search=mint', '?search=astro'])
})

test('import failure resolves to null and allows retry', async () => {
  let shouldFail = true
  const env = createHighlightEnv(() =>
    shouldFail ? Promise.reject(new Error('network')) : Promise.resolve(),
  )
  const failedInit = env.boot()
  await env.dispatchPageLoad()
  assert.equal(await failedInit, null)
  assert.equal(env.window.pagefindHighlight, undefined)
  assert.equal(env.window.pagefindHighlightPromise, undefined)
  assert.deepEqual(env.highlights, [])

  shouldFail = false
  env.enableHighlight()
  env.runInline()
  const retryInit = env.window.pagefindHighlightPromise
  await env.dispatchPageLoad()
  assert.ok(await retryInit)
  assert.equal(env.importCalls.length, 2)
  assert.deepEqual(env.highlights, ['?search=mint'])
})

test('navigating away before delayed import skips stale highlight', async () => {
  const pending = deferred<void>()
  const env = createHighlightEnv(() => pending.promise)
  const init = env.boot()
  const firstLoad = env.dispatchPageLoad()

  env.navigate('/posts/b/')
  const secondLoad = env.dispatchPageLoad()

  env.enableHighlight()
  pending.resolve()
  assert.ok(await init)
  await Promise.all([firstLoad, secondLoad])
  assert.deepEqual(env.highlights, [])
})
