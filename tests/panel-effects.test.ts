import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  finishPendingFadeEffects,
  toggleFadeEffect,
} from '../src/utils/misc.ts'
import { installBrowserGlobals } from './helpers/browser-globals.ts'

const restores: Array<() => void> = []
afterEach(() => {
  finishPendingFadeEffects()
  while (restores.length) restores.pop()!()
})

interface FakeEvent {
  type: string
  bubbles?: boolean
  target?: FakeElement | null
  currentTarget?: FakeElement | null
}

type FakeListener = (event: FakeEvent) => void

interface ListenerEntry {
  listener: FakeListener
  once: boolean
}

class FakeClassList {
  #classes = new Set<string>()

  constructor(initial: string[] = []) {
    for (const token of initial) this.#classes.add(token)
  }

  add(...tokens: string[]) {
    for (const token of tokens) this.#classes.add(token)
  }

  remove(...tokens: string[]) {
    for (const token of tokens) this.#classes.delete(token)
  }

  contains(token: string) {
    return this.#classes.has(token)
  }
}

class FakeStyle {
  overflow = ''
  paddingRight = ''

  removeProperty(name: string) {
    if (name === 'overflow') this.overflow = ''
    if (name === 'padding-right') this.paddingRight = ''
  }
}

class FakeElement {
  id: string
  classList: FakeClassList
  style = new FakeStyle()
  dataset: Record<string, string> = {}
  inert = false
  attributes = new Map<string, string>()
  focusCount = 0
  focusTarget: FakeElement | null = null
  contains(node: unknown): boolean {
    return (
      node === this ||
      (node instanceof FakeElement && node.parentElement === this)
    )
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }
  focus() {
    this.focusCount++
  }
  querySelector() {
    return this.focusTarget
  }
  parentElement: FakeElement | null = null
  #listeners = new Map<string, ListenerEntry[]>()

  constructor(id = '', initialClasses: string[] = []) {
    this.id = id
    this.classList = new FakeClassList(initialClasses)
  }

  appendChild(child: FakeElement) {
    child.parentElement = this
    return child
  }

  addEventListener(
    type: string,
    listener: FakeListener,
    options?: boolean | { once?: boolean },
  ) {
    const entries = this.#listeners.get(type) ?? []
    if (entries.some((entry) => entry.listener === listener)) return
    const once = typeof options === 'object' ? Boolean(options.once) : false
    entries.push({ listener, once })
    this.#listeners.set(type, entries)
  }

  removeEventListener(type: string, listener: FakeListener) {
    const entries = this.#listeners.get(type)
    if (!entries) return
    const next = entries.filter((entry) => entry.listener !== listener)
    if (next.length > 0) this.#listeners.set(type, next)
    else this.#listeners.delete(type)
  }

  listenerCount(type: string) {
    return this.#listeners.get(type)?.length ?? 0
  }

  dispatchEvent(event: FakeEvent) {
    const dispatched: FakeEvent = {
      ...event,
      target: event.target ?? this,
      currentTarget: this,
    }
    let current: FakeElement | null = dispatched.currentTarget ?? null
    while (current) {
      dispatched.currentTarget = current
      const snapshot = [...(current.#listeners.get(dispatched.type) ?? [])]
      for (const entry of snapshot) {
        if (entry.once) {
          current.removeEventListener(dispatched.type, entry.listener)
        }
        entry.listener(dispatched)
      }
      if (!dispatched.bubbles) break
      current = current.parentElement
    }
    return true
  }
}

function createDomEnv(options?: {
  reducedMotion?: boolean
  scrollbarWidth?: number
}) {
  let reducedMotion = options?.reducedMotion ?? false
  const scrollbarWidth = options?.scrollbarWidth ?? 15

  const elements = new Map<string, FakeElement>()
  const docListeners = new Map<string, Set<FakeListener>>()

  const win = {
    innerWidth: 1000,
    matchMedia(query: string) {
      return {
        matches: query.includes('prefers-reduced-motion')
          ? reducedMotion
          : false,
      }
    },
  }

  const body = new FakeElement('body')
  Object.defineProperty(body, 'clientWidth', {
    get() {
      return body.style.overflow === 'hidden'
        ? win.innerWidth
        : win.innerWidth - scrollbarWidth
    },
  })

  const doc = {
    body,
    activeElement: null as FakeElement | null,
    getElementById(id: string) {
      return elements.get(id) ?? null
    },
    addEventListener(type: string, listener: FakeListener) {
      const set = docListeners.get(type) ?? new Set<FakeListener>()
      set.add(listener)
      docListeners.set(type, set)
    },
    removeEventListener(type: string, listener: FakeListener) {
      docListeners.get(type)?.delete(listener)
    },
    dispatchEvent(event: FakeEvent) {
      const listeners = [...(docListeners.get(event.type) ?? [])]
      for (const listener of listeners) listener(event)
      return true
    },
  }

  restores.push(installBrowserGlobals({ window: win, document: doc }))

  return {
    toggleFadeEffect,
    finishPendingFadeEffects,
    body,
    document: doc,
    setReducedMotion(value: boolean) {
      reducedMotion = value
    },
    addElement(id: string, initialClasses: string[] = []) {
      const el = new FakeElement(id, initialClasses)
      elements.set(id, el)
      return el
    },
  }
}

test('rapid close then reopen cancels stale animationend and keeps backdrop open with scroll locked', () => {
  const env = createDomEnv()
  const backdrop = env.addElement('backdrop', ['hidden'])
  const panel = env.addElement('nav-panel', ['hidden!'])

  env.toggleFadeEffect('backdrop', true, 'hidden')
  env.toggleFadeEffect('nav-panel', true, 'hidden!')
  assert.equal(backdrop.classList.contains('hidden'), false)
  assert.equal(backdrop.classList.contains('fade-in'), true)
  assert.equal(env.body.style.overflow, 'hidden')
  assert.equal(env.body.style.paddingRight, '15px')

  env.toggleFadeEffect('backdrop', false, 'hidden')
  env.toggleFadeEffect('nav-panel', false, 'hidden!')
  assert.equal(backdrop.classList.contains('fade-out'), true)
  assert.equal(backdrop.listenerCount('animationend'), 1)
  assert.equal(panel.listenerCount('animationend'), 1)

  // Reopen before fade-out finishes
  env.toggleFadeEffect('backdrop', true, 'hidden')
  env.toggleFadeEffect('nav-panel', true, 'hidden!')
  assert.equal(backdrop.classList.contains('fade-out'), false)
  assert.equal(backdrop.classList.contains('fade-in'), true)
  assert.equal(backdrop.classList.contains('hidden'), false)
  assert.equal(backdrop.listenerCount('animationend'), 0)
  assert.equal(panel.classList.contains('fade-out'), false)
  assert.equal(panel.classList.contains('hidden!'), false)
  assert.equal(panel.listenerCount('animationend'), 0)
  assert.equal(env.body.style.overflow, 'hidden')

  // Late animationend must not hide reopened elements or unlock scroll
  backdrop.dispatchEvent({ type: 'animationend', bubbles: true })
  panel.dispatchEvent({ type: 'animationend', bubbles: true })
  assert.equal(backdrop.classList.contains('hidden'), false)
  assert.equal(panel.classList.contains('hidden!'), false)
  assert.equal(env.body.style.overflow, 'hidden')
  assert.equal(env.body.style.paddingRight, '15px')
})

test('repeated close calls do not stack animationend callbacks', () => {
  const env = createDomEnv()
  const panel = env.addElement('toc-panel', ['hidden!'])
  const backdrop = env.addElement('backdrop', ['hidden'])

  env.toggleFadeEffect('backdrop', true, 'hidden')
  env.toggleFadeEffect('toc-panel', true, 'hidden!')

  env.toggleFadeEffect('toc-panel', false, 'hidden!')
  env.toggleFadeEffect('toc-panel', false, 'hidden!')
  env.toggleFadeEffect('backdrop', false, 'hidden')
  env.toggleFadeEffect('backdrop', false, 'hidden')

  assert.equal(panel.listenerCount('animationend'), 1)
  assert.equal(backdrop.listenerCount('animationend'), 1)

  panel.dispatchEvent({ type: 'animationend', bubbles: true })
  backdrop.dispatchEvent({ type: 'animationend', bubbles: true })

  assert.equal(panel.classList.contains('hidden!'), true)
  assert.equal(panel.classList.contains('fade-out'), false)
  assert.equal(panel.listenerCount('animationend'), 0)
  assert.equal(backdrop.classList.contains('hidden'), true)
  assert.equal(backdrop.listenerCount('animationend'), 0)
  assert.equal(env.body.style.overflow, '')
  assert.equal(env.body.style.paddingRight, '')

  // Closing an already-hidden element leaves no residual animation class or listener
  env.toggleFadeEffect('toc-panel', false, 'hidden!')
  assert.equal(panel.classList.contains('fade-out'), false)
  assert.equal(panel.listenerCount('animationend'), 0)
})

test('bubbled child animationend does not close parent or consume its listener', () => {
  const env = createDomEnv()
  const backdrop = env.addElement('backdrop', ['hidden'])
  const panel = env.addElement('nav-panel', ['hidden!'])
  const child = panel.appendChild(new FakeElement('nav-child'))

  env.toggleFadeEffect('backdrop', true, 'hidden')
  env.toggleFadeEffect('nav-panel', true, 'hidden!')
  env.toggleFadeEffect('backdrop', false, 'hidden')
  env.toggleFadeEffect('nav-panel', false, 'hidden!')

  child.dispatchEvent({ type: 'animationend', bubbles: true })

  assert.equal(panel.classList.contains('hidden!'), false)
  assert.equal(panel.classList.contains('fade-out'), true)
  assert.equal(panel.listenerCount('animationend'), 1)
  assert.equal(env.body.style.overflow, 'hidden')

  panel.dispatchEvent({ type: 'animationend', bubbles: true })
  backdrop.dispatchEvent({ type: 'animationend', bubbles: true })

  assert.equal(panel.classList.contains('hidden!'), true)
  assert.equal(panel.classList.contains('fade-out'), false)
  assert.equal(panel.listenerCount('animationend'), 0)
  assert.equal(backdrop.classList.contains('hidden'), true)
  assert.equal(env.body.style.overflow, '')
})

test('prefers-reduced-motion leaves no residual fade classes or callbacks', () => {
  const env = createDomEnv({ reducedMotion: true })
  const backdrop = env.addElement('backdrop', ['hidden'])
  const panel = env.addElement('tag-panel', ['hidden!'])

  env.toggleFadeEffect('backdrop', true, 'hidden')
  env.toggleFadeEffect('tag-panel', true, 'hidden!')
  assert.equal(backdrop.classList.contains('hidden'), false)
  assert.equal(backdrop.classList.contains('fade-in'), false)
  assert.equal(panel.classList.contains('fade-in'), false)
  assert.equal(env.body.style.overflow, 'hidden')

  env.toggleFadeEffect('backdrop', false, 'hidden')
  env.toggleFadeEffect('tag-panel', false, 'hidden!')
  assert.equal(backdrop.classList.contains('hidden'), true)
  assert.equal(backdrop.classList.contains('fade-out'), false)
  assert.equal(backdrop.listenerCount('animationend'), 0)
  assert.equal(panel.classList.contains('hidden!'), true)
  assert.equal(panel.classList.contains('fade-out'), false)
  assert.equal(panel.listenerCount('animationend'), 0)
  assert.equal(env.body.style.overflow, '')
  assert.equal(env.body.style.paddingRight, '')

  // Switching to reduced motion mid-fade cleans up pending listener and classes
  env.setReducedMotion(false)
  env.toggleFadeEffect('backdrop', true, 'hidden')
  env.toggleFadeEffect('backdrop', false, 'hidden')
  assert.equal(backdrop.listenerCount('animationend'), 1)
  assert.equal(backdrop.classList.contains('fade-out'), true)

  env.setReducedMotion(true)
  env.toggleFadeEffect('backdrop', true, 'hidden')
  assert.equal(backdrop.listenerCount('animationend'), 0)
  assert.equal(backdrop.classList.contains('fade-in'), false)
  assert.equal(backdrop.classList.contains('fade-out'), false)
  assert.equal(env.body.style.overflow, 'hidden')
})

test('navigation cleanup finalizes unfinished fade-out and unlocks backdrop scroll', () => {
  const env = createDomEnv()
  const backdrop = env.addElement('backdrop', ['hidden'])
  const panel = env.addElement('search-panel', ['hidden'])

  env.toggleFadeEffect('backdrop', true, 'hidden')
  env.toggleFadeEffect('search-panel', true, 'hidden')
  env.toggleFadeEffect('backdrop', false, 'hidden')
  env.toggleFadeEffect('search-panel', false, 'hidden')

  assert.equal(env.body.style.overflow, 'hidden')
  assert.equal(backdrop.listenerCount('animationend'), 1)
  assert.equal(panel.listenerCount('animationend'), 1)

  env.finishPendingFadeEffects()

  assert.equal(backdrop.classList.contains('hidden'), true)
  assert.equal(backdrop.classList.contains('fade-out'), false)
  assert.equal(backdrop.listenerCount('animationend'), 0)
  assert.equal(panel.classList.contains('hidden'), true)
  assert.equal(panel.classList.contains('fade-out'), false)
  assert.equal(panel.listenerCount('animationend'), 0)
  assert.equal(env.body.style.overflow, '')
  assert.equal(env.body.style.paddingRight, '')
})

test('panels sync expanded state, focus their content and restore the trigger on close', () => {
  const env = createDomEnv({ reducedMotion: true })
  const trigger = env.addElement('nav-open-button')
  const panel = env.addElement('nav-panel', ['hidden!'])
  const link = panel.appendChild(new FakeElement('nav-link'))
  panel.dataset.panelTrigger = trigger.id
  panel.focusTarget = link

  env.toggleFadeEffect(panel.id, true, 'hidden!')
  assert.equal(trigger.attributes.get('aria-expanded'), 'true')
  assert.equal(panel.inert, false)
  assert.equal(link.focusCount, 1)

  env.document.activeElement = link
  env.toggleFadeEffect(panel.id, false, 'hidden!')
  assert.equal(trigger.attributes.get('aria-expanded'), 'false')
  assert.equal(panel.inert, true)
  assert.equal(trigger.focusCount, 1)

  env.toggleFadeEffect(panel.id, true, 'hidden!')
  assert.equal(panel.inert, false)
  env.document.activeElement = env.body
  env.toggleFadeEffect(panel.id, false, 'hidden!')
  assert.equal(trigger.focusCount, 2, 'backdrop clicks can move focus to body')

  env.toggleFadeEffect(panel.id, true, 'hidden!')
  env.document.activeElement = env.addElement('outside-link')
  env.toggleFadeEffect(panel.id, false, 'hidden!')
  assert.equal(trigger.focusCount, 2, 'do not steal focus from another control')
})

test('browser globals are restored without leaving new properties behind', () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const restore = installBrowserGlobals({ window: { marker: true } })
  try {
    assert.deepEqual(Reflect.get(globalThis, 'window'), { marker: true })
  } finally {
    restore()
  }
  assert.deepEqual(
    Object.getOwnPropertyDescriptor(globalThis, 'window'),
    before,
  )
})
