import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const script = readFileSync(
  new URL('../src/components/tags/TagFilter.astro', import.meta.url),
  'utf8',
).match(/<script>([\s\S]*?)<\/script>/)?.[1]
assert.ok(script)
const code = stripTypeScriptTypes(script)

type Listener = (event: FakeEvent) => void

class FakeEvent {
  type: string
  target: unknown = null
  detail: unknown
  constructor(type: string, init?: { detail?: unknown }) {
    this.type = type
    this.detail = init?.detail
  }
}

class FakeTarget {
  #listeners = new Map<string, Set<Listener>>()
  addEventListener(type: string, fn: Listener) {
    const set = this.#listeners.get(type) ?? new Set<Listener>()
    set.add(fn)
    this.#listeners.set(type, set)
  }
  removeEventListener(type: string, fn: Listener) {
    this.#listeners.get(type)?.delete(fn)
  }
  dispatchEvent(event: FakeEvent) {
    event.target ??= this
    for (const fn of [...(this.#listeners.get(event.type) ?? [])]) fn(event)
    return true
  }
  listenerCount(type: string) {
    return this.#listeners.get(type)?.size ?? 0
  }
}

class FakeElement extends FakeTarget {
  isConnected = true
  dataset: Record<string, string | undefined> = {}
  #classes = new Set<string>()
  classList = {
    add: (c: string) => this.#classes.add(c),
    remove: (c: string) => this.#classes.delete(c),
    toggle: (c: string, force?: boolean) => {
      if (force ?? !this.#classes.has(c)) this.#classes.add(c)
      else this.#classes.delete(c)
    },
    contains: (c: string) => this.#classes.has(c),
  }
  ariaSelected: string | null = null
  disabled = false
  contains: (node: unknown) => boolean = () => false
  closest: (sel: string) => FakeElement | null = () => null
  querySelectorAll: (sel: string) => FakeElement[] = () => []
  connectedCallback() {}
  disconnectedCallback() {}
}

function buildButtons(items: string[][]) {
  const map = new Map<string, Set<string>>()
  for (const item of items) {
    for (const a of item) {
      const set = map.get(a) ?? new Set<string>()
      for (const b of item) if (a !== b) set.add(b)
      map.set(a, set)
    }
  }
  return [...map.keys()].sort().map((tag) => {
    const btn = new FakeElement()
    btn.dataset = { tag, related: [...(map.get(tag) ?? [])].join(',') }
    btn.closest = (sel) => (sel === 'button[data-tag]' ? btn : null)
    return btn
  })
}

function createHarness(
  opts: {
    mode?: 'AND' | 'OR'
    useIdle?: boolean
    stored?: string[]
    items?: string[][]
    instances?: number
  } = {},
) {
  const {
    mode = 'AND',
    useIdle = true,
    stored,
    items = [
      ['A', 'B'],
      ['A', 'C'],
      ['B', 'C'],
    ],
    instances = 1,
  } = opts
  const itemEls = items.map((tags) => {
    const el = new FakeElement()
    el.dataset = { tags: tags.join(',') }
    return el
  })
  const storage = new Map<string, string>()
  if (stored) storage.set('tag-filter:selected:/blog', JSON.stringify(stored))
  const doc = Object.assign(new FakeTarget(), {
    querySelectorAll: (sel: string) => (sel === '[data-tags]' ? itemEls : []),
  })
  let nextId = 1
  const idleQueue = new Map<number, () => void>()
  const timerQueue = new Map<number, () => void>()
  const rafQueue = new Map<number, () => void>()
  const cancelled = { idle: 0, timer: 0 }
  const enqueue = (q: Map<number, () => void>, fn: () => void) => {
    const id = nextId++
    q.set(id, fn)
    return id
  }
  const win: Record<string, unknown> = useIdle
    ? {
        requestIdleCallback: (
          cb: (d: { didTimeout: boolean; timeRemaining: () => number }) => void,
        ) =>
          enqueue(idleQueue, () =>
            cb({ didTimeout: false, timeRemaining: () => 50 }),
          ),
        cancelIdleCallback: (id: number) => {
          cancelled.idle++
          idleQueue.delete(id)
        },
      }
    : {}
  const defs = new Map<string, new () => FakeElement>()
  const run = () =>
    runInNewContext(code, {
      HTMLElement: FakeElement,
      Element: FakeElement,
      Event: FakeEvent,
      CustomEvent: FakeEvent,
      URL,
      location: { pathname: '/blog/' },
      sessionStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => storage.set(k, v),
      },
      document: doc,
      window: win,
      setTimeout: (cb: () => void) => enqueue(timerQueue, cb),
      clearTimeout: (id: number) => {
        cancelled.timer++
        timerQueue.delete(id)
      },
      requestAnimationFrame: (cb: () => void) => enqueue(rafQueue, cb),
      console: { debug: () => {} },
      customElements: {
        get: (n: string) => defs.get(n),
        define: (n: string, c: new () => FakeElement) => defs.set(n, c),
      },
    })
  run()
  run()
  const TagFilter = defs.get('tag-filter')
  assert.ok(TagFilter)
  const mounts = Array.from({ length: instances }, () => {
    const buttons = buildButtons(items)
    const el = new TagFilter()
    el.dataset = { itemSelector: '[data-tags]', filterMode: mode }
    el.querySelectorAll = (sel) => (sel === 'button[data-tag]' ? buttons : [])
    el.contains = (node) => buttons.includes(node as FakeElement)
    return { el, buttons }
  })
  const flush = (q: Map<number, () => void>) => {
    const fns = [...q.values()]
    q.clear()
    for (const fn of fns) fn()
  }
  return {
    cancelled,
    idleQueue,
    timerQueue,
    rafQueue,
    doc,
    connect: (i = 0) => {
      mounts[i].el.isConnected = true
      mounts[i].el.connectedCallback()
    },
    disconnect: (i = 0) => {
      mounts[i].el.isConnected = false
      mounts[i].el.disconnectedCallback()
    },
    flushAll: () => {
      flush(idleQueue)
      flush(timerQueue)
      flush(rafQueue)
    },
    flushRaf: () => flush(rafQueue),
    click: (tag: string, i = 0) => {
      const btn = mounts[i].buttons.find((b) => b.dataset.tag === tag)
      assert.ok(btn && !btn.disabled, `cannot click ${tag}`)
      const ev = new FakeEvent('click')
      ev.target = btn
      mounts[i].el.dispatchEvent(ev)
    },
    sync: (selected: unknown[]) =>
      doc.dispatchEvent(
        new FakeEvent('tag-filter:sync', {
          detail: { sourceId: 'ext', selected },
        }),
      ),
    visible: () =>
      itemEls
        .filter((el) => !el.classList.contains('hidden'))
        .map((el) => el.dataset.tags),
    btn: (tag: string, i = 0) => {
      const b = mounts[i].buttons.find((x) => x.dataset.tag === tag)
      assert.ok(b)
      return { ariaSelected: b.ariaSelected, disabled: b.disabled }
    },
  }
}

test('filters stale tags on restore/sync and syncs dual instances', () => {
  const items = [['A', 'B'], ['A', 'C'], ['B', 'C'], ['D']]
  const stale = createHarness({ items, stored: ['removed-tag'] })
  stale.connect()
  stale.flushAll()
  assert.deepEqual(stale.visible(), ['A,B', 'A,C', 'B,C', 'D'])
  for (const t of ['A', 'B', 'C', 'D'])
    assert.deepEqual(stale.btn(t), { ariaSelected: 'false', disabled: false })

  const h = createHarness({ items, stored: ['A', 'removed-tag'], instances: 2 })
  h.connect(0)
  h.connect(1)
  h.flushAll()
  assert.deepEqual(h.visible(), ['A,B', 'A,C'])
  assert.deepEqual(h.btn('A', 0), { ariaSelected: 'true', disabled: false })
  assert.deepEqual(h.btn('D', 0), { ariaSelected: 'false', disabled: true })
  assert.deepEqual(h.btn('A', 1), { ariaSelected: 'true', disabled: false })

  h.click('B', 0)
  h.flushRaf()
  assert.deepEqual(h.visible(), ['A,B'])
  assert.deepEqual(h.btn('B', 1), { ariaSelected: 'true', disabled: false })
  assert.deepEqual(h.btn('C', 1), { ariaSelected: 'false', disabled: true })

  h.sync(['B', 'removed-tag'])
  assert.deepEqual(h.btn('A', 0), { ariaSelected: 'false', disabled: false })
  assert.deepEqual(h.btn('B', 0), { ariaSelected: 'true', disabled: false })
  assert.deepEqual(h.btn('D', 0), { ariaSelected: 'false', disabled: true })
  h.sync(['removed-tag'])
  for (const t of ['A', 'B', 'C', 'D'])
    assert.deepEqual(h.btn(t, 0), { ariaSelected: 'false', disabled: false })
})

test('AND uses matching items on AB/AC/BC triangle while OR stays unchanged', () => {
  const and = createHarness({ mode: 'AND' })
  and.connect()
  and.flushAll()
  and.click('A')
  and.flushRaf()
  assert.deepEqual(and.visible(), ['A,B', 'A,C'])
  assert.deepEqual(and.btn('B'), { ariaSelected: 'false', disabled: false })
  assert.deepEqual(and.btn('C'), { ariaSelected: 'false', disabled: false })

  and.click('B')
  and.flushRaf()
  assert.deepEqual(and.visible(), ['A,B'])
  assert.deepEqual(and.btn('A'), { ariaSelected: 'true', disabled: false })
  assert.deepEqual(and.btn('B'), { ariaSelected: 'true', disabled: false })
  assert.deepEqual(and.btn('C'), { ariaSelected: 'false', disabled: true })

  and.click('B')
  and.flushRaf()
  assert.deepEqual(and.visible(), ['A,B', 'A,C'])
  assert.deepEqual(and.btn('C'), { ariaSelected: 'false', disabled: false })

  const or = createHarness({ mode: 'OR' })
  or.connect()
  or.flushAll()
  or.click('A')
  or.flushRaf()
  or.click('B')
  or.flushRaf()
  assert.deepEqual(or.visible(), ['A,B', 'A,C', 'B,C'])
  assert.deepEqual(or.btn('C'), { ariaSelected: 'false', disabled: false })
})

test('cancels pending idle callback, invalidates pending RAF, and reconnects', () => {
  const h = createHarness({ useIdle: true })
  h.connect()
  assert.equal(h.idleQueue.size, 1)
  assert.equal(h.doc.listenerCount('tag-filter:sync'), 0)
  const staleIdle = [...h.idleQueue.values()]
  h.disconnect()
  assert.equal(h.idleQueue.size, 0)
  assert.equal(h.cancelled.idle, 1)
  for (const fn of staleIdle) fn()
  assert.equal(h.doc.listenerCount('tag-filter:sync'), 0)

  h.connect()
  h.flushAll()
  assert.equal(h.doc.listenerCount('tag-filter:sync'), 1)
  h.click('A')
  h.flushRaf()
  assert.deepEqual(h.visible(), ['A,B', 'A,C'])

  h.click('B')
  assert.equal(h.rafQueue.size, 1)
  h.disconnect()
  assert.equal(h.doc.listenerCount('tag-filter:sync'), 0)
  h.connect()
  h.flushRaf()
  assert.deepEqual(h.visible(), [])
  h.flushAll()
  assert.equal(h.doc.listenerCount('tag-filter:sync'), 1)
  assert.deepEqual(h.visible(), ['A,B'])
  assert.deepEqual(h.btn('C'), { ariaSelected: 'false', disabled: true })
})

test('cancels pending setTimeout fallback on disconnect and reconnects', () => {
  const h = createHarness({ useIdle: false })
  h.connect()
  assert.equal(h.timerQueue.size, 1)
  const staleTimers = [...h.timerQueue.values()]
  h.disconnect()
  assert.equal(h.timerQueue.size, 0)
  assert.equal(h.cancelled.timer, 1)
  for (const fn of staleTimers) fn()
  assert.equal(h.doc.listenerCount('tag-filter:sync'), 0)

  h.connect()
  h.flushAll()
  assert.equal(h.doc.listenerCount('tag-filter:sync'), 1)
  h.click('A')
  h.flushRaf()
  assert.deepEqual(h.visible(), ['A,B', 'A,C'])
})
