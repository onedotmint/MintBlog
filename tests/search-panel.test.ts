import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, test } from 'node:test'
import {
  registerSearchPanel,
  type PagefindApi,
} from '../src/scripts/search-panel.ts'
import { installBrowserGlobals } from './helpers/browser-globals.ts'
import { toggleFadeEffect } from '../src/utils/misc.ts'

const source = readFileSync(
  new URL('../src/components/widgets/SearchSwitch.astro', import.meta.url),
  'utf8',
)
const restores: Array<() => void> = []
afterEach(() => {
  while (restores.length) restores.pop()!()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

type Event = {
  target?: unknown
  currentTarget?: unknown
  key?: string
  isComposing?: boolean
  keyCode?: number
  preventDefault?: () => void
}
type Listener = (event: Event) => unknown

function harness(
  options: {
    empty?: boolean
    production?: boolean
    filter?: boolean
    batchSize?: number
    resultCount?: number
    stored?: string
    blockedStorage?: boolean
    importModule?: () => Promise<PagefindApi>
    waitForData?: (query: string) => Promise<void>
  } = {},
) {
  class Element {
    dataset: Record<string, string> = {}
    attributes = new Map<string, string>()
    children: Element[] = []
    parentElement: Element | null = null
    listeners = new Map<string, Set<Listener>>()
    className = ''
    textContent = ''
    innerHTML = ''
    value = ''
    id = ''
    href = ''
    style = { display: '' }
    isConnected = true
    inert = false
    clicks = 0
    classes = new Set<string>()
    classList = {
      add: (...names: string[]) =>
        names.forEach((name) => this.classes.add(name)),
      remove: (...names: string[]) =>
        names.forEach((name) => this.classes.delete(name)),
      toggle: (name: string, force: boolean) =>
        force ? this.classes.add(name) : this.classes.delete(name),
    }
    tag: string
    constructor(tag = 'search-panel') {
      this.tag = tag
      if (tag === 'search-panel')
        this.dataset = {
          filter: String(Boolean(options.filter)),
          production: String(options.production ?? true),
          maxItems: '5',
          emptyIndex: String(Boolean(options.empty)),
          pagefindUrl: '/base/pagefind/pagefind.js',
          ...(options.batchSize && { batchSize: String(options.batchSize) }),
        }
    }
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value)
      if (name === 'id') this.id = value
    }
    removeAttribute(name: string) {
      this.attributes.delete(name)
    }
    addEventListener(type: string, fn: Listener) {
      const listeners = this.listeners.get(type) ?? new Set<Listener>()
      listeners.add(fn)
      this.listeners.set(type, listeners)
    }
    removeEventListener(type: string, fn: Listener) {
      this.listeners.get(type)?.delete(fn)
    }
    async emit(type: string, event: Event = {}) {
      await Promise.all(
        [...(this.listeners.get(type) ?? [])].map((fn) =>
          fn({ ...event, target: event.target ?? this, currentTarget: this }),
        ),
      )
    }
    appendChild(child: Element) {
      if (child.tag === 'fragment')
        child.children.forEach((node) => this.appendChild(node))
      else {
        this.children.push(child)
        child.parentElement = this
      }
      return child
    }
    append(...children: Element[]) {
      children.forEach((child) => this.appendChild(child))
    }
    replaceChildren() {
      this.children = []
    }
    querySelector(selector: string): Element | null {
      if (selector === 'a')
        return this.querySelectorAll('[role="option"]')[0] ?? null
      if (selector === 'span')
        return this.children.find((child) => child.tag === 'span') ?? null
      return nodes.get(selector) ?? null
    }
    querySelectorAll(selector: string): Element[] {
      if (selector === '[role="tab"]') return tabs
      return this.children.flatMap((child) => [
        ...(child.attributes.get('role') === 'option' ? [child] : []),
        ...child.querySelectorAll(selector),
      ])
    }
    closest(): Element | null {
      return this.tag === 'a' ? this : (this.parentElement?.closest() ?? null)
    }
    contains(node: unknown): boolean {
      return (
        node === this || this.children.some((child) => child.contains(node))
      )
    }
    focus() {
      doc.activeElement = this
    }
    click() {
      this.clicks++
    }
    scrollIntoView() {}
    cloneNode() {
      return new Element(this.tag)
    }
    replaceWith() {}
    connectedCallback() {}
    disconnectedCallback() {}
  }
  class Anchor extends Element {
    constructor() {
      super('a')
    }
  }
  const nodes = new Map<string, Element>()
  for (const id of [
    'search-input',
    'search-label',
    'search-results',
    'search-content',
    'search-feedback',
    'search-pagination',
  ]) {
    nodes.set(`#${id}`, new Element(id === 'search-input' ? 'input' : 'div'))
  }
  for (const action of ['more', 'all']) {
    const button = new Element('button')
    button.dataset.action = action
    button.appendChild(new Element('span'))
    nodes.set(`[data-action="${action}"]`, button)
  }
  const tabs = ['blog', 'shorts'].map((type) => {
    const tab = new Element('button')
    tab.dataset.type = type
    tab.dataset.label = type === 'shorts' ? 'Collections' : 'Blog'
    tab.id = `search-tab-${type}`
    return tab
  })
  const doc = {
    body: new Element('body'),
    getElementById: (id: string) => nodes.get(`#${id}`) ?? null,
    activeElement: nodes.get('#search-input')!,
    createElement: (tag: string) =>
      tag === 'a' ? new Anchor() : new Element(tag),
    createDocumentFragment: () => new Element('fragment'),
  }
  let Panel!: new () => Element
  const queries: string[] = []
  let imports = 0
  const index = {
    options: async () => {},
    init: async () => {},
    debouncedSearch: async (value: string) => {
      queries.push(value)
      return {
        results: Array.from({ length: options.resultCount ?? 1 }, () => ({
          data: async () => {
            await options.waitForData?.(value)
            return {
              meta: { title: value },
              sub_results: [1, 2].map((id) => ({
                title: `${value}${id}`,
                url: `/post/#${id}`,
                excerpt: value,
                weighted_locations: [{ weight: id }],
              })),
            }
          },
        })),
      }
    },
  }
  restores.push(
    installBrowserGlobals({
      HTMLElement: Element,
      HTMLAnchorElement: Anchor,
      localStorage: {
        getItem: () => {
          if (options.blockedStorage) throw new Error('blocked')
          return options.stored ?? null
        },
        setItem: () => {
          if (options.blockedStorage) throw new Error('blocked')
        },
      },
      document: doc,
      window: { matchMedia: () => ({ matches: true }) },
      customElements: {
        get: () => undefined,
        define: (_name: string, ctor: new () => Element) => {
          Panel = ctor
        },
      },
    }),
  )
  registerSearchPanel(() => {
    imports++
    return options.importModule?.() ?? Promise.resolve(index)
  })
  const panel = new Panel()
  panel.connectedCallback()
  const input = nodes.get('#search-input')!
  const content = nodes.get('#search-content')!
  return {
    panel,
    input,
    content,
    doc,
    tabs,
    queries,
    index,
    nodes,
    imports: () => imports,
    feedback: () => nodes.get('#search-feedback')!.textContent,
    search: async (value: string) => {
      input.value = value
      await input.emit('input')
      await settle()
    },
  }
}

test('search waits for one index initialization and ignores stale queries', async () => {
  const pending = deferred<PagefindApi>()
  const env = harness({ importModule: () => pending.promise })
  const first = env.search('old')
  const second = env.search('new')
  assert.equal(env.imports(), 1)
  assert.deepEqual(env.queries, [])
  pending.resolve(env.index)
  await Promise.all([first, second])
  assert.deepEqual(env.queries, ['new'])
  assert.equal(env.content.querySelectorAll('[role="option"]').length, 2)
})

test('failed index initialization is retried on the next input', async () => {
  let fail = true
  const env = harness({
    importModule: () =>
      fail ? Promise.reject(new Error('offline')) : Promise.resolve(index),
  })
  const index: PagefindApi = env.index
  await env.search('first')
  assert.match(env.feedback(), /Something went wrong/)
  fail = false
  await env.search('second')
  assert.equal(env.imports(), 2)
  assert.deepEqual(env.queries, ['second'])
})

test('empty indexes and disconnected panels do not issue searches', async () => {
  const empty = harness({ empty: true })
  await empty.search('mint')
  assert.equal(empty.imports(), 0)
  assert.match(empty.feedback(), /No results/)
  const pending = deferred<PagefindApi>()
  const env = harness({ importModule: () => pending.promise })
  const input = env.search('mint')
  env.panel.disconnectedCallback()
  pending.resolve(env.index)
  await input
  assert.deepEqual(env.queries, [])
  assert.equal(env.input.listeners.get('compositionstart')?.size, 0)
})

test('IME composition never activates a selected result and searches after committing text', async () => {
  const env = harness()
  await env.search('old')
  const selected = env.content.querySelector('a')!
  let prevented = 0
  await env.panel.emit('keydown', {
    key: 'Enter',
    isComposing: true,
    preventDefault: () => {
      prevented++
    },
  })
  await env.panel.emit('keydown', {
    key: 'Enter',
    keyCode: 229,
    preventDefault: () => {
      prevented++
    },
  })
  assert.equal(selected.clicks, 0)
  assert.equal(prevented, 0)
  await env.input.emit('compositionstart')
  env.input.value = 'zhong'
  await env.input.emit('input', { isComposing: true })
  assert.deepEqual(env.queries, ['old'])
  env.input.value = '中文'
  await env.input.emit('compositionend')
  await settle()
  assert.deepEqual(env.queries, ['old', '中文'])
})

test('unavailable or invalid browser storage cannot break category initialization or switching', async () => {
  for (const stored of ['-1', '99', 'NaN', '1garbage']) {
    const env = harness({ filter: true, stored })
    assert.equal(env.tabs[0].attributes.get('aria-selected'), 'true')
  }
  const env = harness({ filter: true, blockedStorage: true })
  assert.equal(env.tabs[0].attributes.get('aria-selected'), 'true')
  await env.tabs[1].emit('click')
  assert.equal(env.tabs[1].attributes.get('aria-selected'), 'true')
})

test('stale result rendering cannot clear the current request loading state', async () => {
  const oldData = deferred<void>()
  const newData = deferred<void>()
  const env = harness({
    waitForData: (query) =>
      query === 'old' ? oldData.promise : newData.promise,
  })
  const oldSearch = env.search('old')
  await settle()
  const newSearch = env.search('new')
  await settle()
  oldData.resolve(undefined)
  await oldSearch
  assert.equal(
    env.nodes.get('#search-results')!.attributes.get('aria-busy'),
    'true',
  )
  newData.resolve(undefined)
  await newSearch
  assert.equal(
    env.nodes.get('#search-results')!.attributes.has('aria-busy'),
    false,
  )
})

test('result navigation keeps the active descendant synchronized and clears it on reset', async () => {
  const env = harness()
  await env.search('mint')
  const [first, second] = env.content.querySelectorAll('[role="option"]')
  assert.ok(first.id && second.id && first.id !== second.id)
  assert.equal(env.input.attributes.get('aria-activedescendant'), first.id)
  assert.equal(env.input.attributes.get('aria-expanded'), 'true')
  const key = (key: string) =>
    env.panel.emit('keydown', { key, preventDefault() {} })
  await key('ArrowDown')
  assert.equal(env.input.attributes.get('aria-activedescendant'), second.id)
  assert.equal(first.attributes.get('aria-selected'), 'false')
  await key('ArrowDown')
  assert.equal(env.input.attributes.get('aria-activedescendant'), first.id)
  await key('ArrowUp')
  await key('Enter')
  assert.equal(second.clicks, 1)
  await env.search('')
  assert.equal(env.input.attributes.has('aria-activedescendant'), false)
  assert.equal(env.input.attributes.get('aria-expanded'), 'false')
})

test('category arrows, Home and End move focus without returning it to the input', async () => {
  const env = harness({ filter: true, blockedStorage: true })
  await env.search('mint')
  await env.tabs[0].emit('keydown', { key: 'ArrowRight', preventDefault() {} })
  await settle()
  assert.equal(env.doc.activeElement, env.tabs[1])
  assert.equal(env.tabs[0].attributes.get('tabindex'), '-1')
  assert.equal(env.tabs[1].attributes.get('tabindex'), '0')
  assert.equal(
    env.nodes.get('#search-label')!.textContent,
    'Search Collections',
  )
  assert.equal(
    env.nodes.get('#search-results')!.attributes.get('aria-labelledby'),
    'search-tab-shorts',
  )
  await env.tabs[1].emit('keydown', { key: 'Home', preventDefault() {} })
  await settle()
  assert.equal(env.doc.activeElement, env.tabs[0])
  await env.tabs[0].emit('keydown', { key: 'End', preventDefault() {} })
  await settle()
  assert.equal(env.doc.activeElement, env.tabs[1])
})

test('pagination and status are outside the listbox, with named article groups inside it', async () => {
  assert.match(source, /id="search-content" role="listbox"[^>]*><\/div>/)
  assert.match(source, /id="search-feedback"\s+role="status"/)
  assert.match(source, /aria-controls="search-content"/)
  const env = harness()
  await env.search('mint')
  assert.equal(env.content.children[0].attributes.get('role'), 'group')
  assert.equal(env.content.children[0].attributes.get('aria-label'), 'mint')
})

test('loading another batch preserves selection and gives new options distinct IDs', async () => {
  const env = harness({ batchSize: 1, resultCount: 2 })
  await env.search('mint')
  const selectedId = env.input.attributes.get('aria-activedescendant')
  assert.equal(env.content.querySelectorAll('[role="option"]').length, 2)
  await env.nodes.get('[data-action="more"]')!.emit('click')
  await settle()
  const options = env.content.querySelectorAll('[role="option"]')
  assert.equal(options.length, 4)
  assert.equal(new Set(options.map((option) => option.id)).size, 4)
  assert.equal(env.input.attributes.get('aria-activedescendant'), selectedId)
  assert.equal(env.nodes.get('#search-pagination')!.style.display, 'none')
})

test('development fixtures use the production result renderer without loading Pagefind', async () => {
  const env = harness({ production: false })
  await env.search('mint')
  assert.equal(env.imports(), 0)
  assert.equal(env.content.children[0].attributes.get('role'), 'group')
  assert.equal(env.content.querySelectorAll('[role="option"]').length, 2)
  assert.ok(env.input.attributes.get('aria-activedescendant'))
})

test('a stale category click cannot steal focus after keyboard navigation returns to that category', async () => {
  const pending = deferred<PagefindApi>()
  const env = harness({ filter: true, importModule: () => pending.promise })
  const search = env.search('mint')
  const click = env.tabs[1].emit('click')
  await env.tabs[1].emit('keydown', { key: 'ArrowLeft', preventDefault() {} })
  await env.tabs[0].emit('keydown', { key: 'ArrowRight', preventDefault() {} })
  assert.equal(env.doc.activeElement, env.tabs[1])

  pending.resolve(env.index)
  await Promise.all([search, click])
  await settle()
  assert.equal(env.doc.activeElement, env.tabs[1])
  await env.tabs[0].emit('click')
  assert.equal(
    env.doc.activeElement,
    env.input,
    'the latest click still returns focus to the input',
  )
})

for (const action of ['more', 'all']) {
  test(`pending ${action} pagination never steals focus from a later category change`, async () => {
    const pending = deferred<void>()
    let blocked = false
    const env = harness({
      filter: true,
      batchSize: 1,
      resultCount: 2,
      waitForData: () => (blocked ? pending.promise : Promise.resolve()),
    })
    await env.search('mint')
    blocked = true
    const button = env.nodes.get(`[data-action="${action}"]`)!
    button.focus()
    const pagination = button.emit('click')
    const focusedImmediately = env.doc.activeElement === env.input
    blocked = false
    await env.tabs[0].emit('keydown', {
      key: 'ArrowRight',
      preventDefault() {},
    })
    await settle()
    assert.equal(env.doc.activeElement, env.tabs[1])
    pending.resolve(undefined)
    await pagination
    assert.equal(env.doc.activeElement, env.tabs[1])
    assert.ok(
      focusedImmediately,
      'click focus is synchronous, not tied to network completion',
    )
  })
}

test('closing and reopening the panel prevents an old category search from moving focus', async () => {
  const pending = deferred<PagefindApi>()
  const env = harness({ filter: true, importModule: () => pending.promise })
  env.panel.dataset.panelTrigger = 'search-switch'
  env.panel.append(env.input, ...env.tabs)
  env.nodes.set('#search-panel', env.panel)
  env.nodes.set('#search-switch', env.doc.createElement('button'))
  env.nodes.set('[data-panel-autofocus]', env.input)
  const search = env.search('mint')
  const click = env.tabs[1].emit('click')
  toggleFadeEffect('search-panel', false, 'hidden')
  assert.equal(env.panel.inert, true)
  toggleFadeEffect('search-panel', true, 'hidden')
  assert.equal(env.panel.inert, false)
  env.tabs[1].focus()
  pending.resolve(env.index)
  await Promise.all([search, click])
  await settle()
  assert.equal(env.doc.activeElement, env.tabs[1])
})
