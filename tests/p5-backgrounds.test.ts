import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve))

function background(name: string) {
  const source = readFileSync(
    new URL(`../src/components/backgrounds/${name}.astro`, import.meta.url),
    'utf8',
  )
  // Astro bundles this script for the browser; frontmatter must not import p5.
  assert.doesNotMatch(source.split('---')[1], /import.*p5/)
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(script)
  const code = stripTypeScriptTypes(
    script.replace(/^\s*import[^\n]*from 'p5'\s*$/gm, ''),
  )
  const instances: FakeP5[] = []
  const errors: unknown[][] = []
  class FakeP5 {
    setup!: () => void
    canvas = false
    removeCalls = 0
    removed = deferred()

    constructor(sketch: (p: FakeP5) => void) {
      sketch(this)
      instances.push(this)
      // Like v2's async presetup, setup has not run when construction returns.
    }

    createCanvas() {
      this.canvas = true
    }

    frameRate() {}

    random() {
      return 0.5
    }

    async remove() {
      this.removeCalls++
      // v2 cannot clean up a canvas that its pending setup has not created yet.
      if (!this.canvas) return
      await this.removed.promise
      this.canvas = false
    }
  }
  class Element {
    isConnected = true
  }
  interface BackgroundElement extends Element {
    lifecycle: Promise<void>
    connectedCallback(): void
    disconnectedCallback(): void
  }
  const definitions = new Map<string, new () => BackgroundElement>()
  const customElements = {
    get: (tag: string) => definitions.get(tag),
    define(tag: string, element: new () => BackgroundElement) {
      assert.equal(
        definitions.has(tag),
        false,
        'duplicate element registration',
      )
      definitions.set(tag, element)
    },
  }
  const evaluate = () =>
    runInNewContext(code, {
      p5: FakeP5,
      HTMLElement: Element,
      customElements,
      window: { innerWidth: 100, innerHeight: 100 },
      console: { error: (...args: unknown[]) => errors.push(args) },
    })
  evaluate()
  evaluate()
  const Background = definitions.get(`bg-${name.toLowerCase()}`)
  assert.ok(Background)
  return { element: new Background(), instances, errors }
}

for (const name of ['Dot', 'Particle']) {
  test(`${name}: detach during presetup and reconnect wait for async removal`, async () => {
    const { element, instances, errors } = background(name)
    element.connectedCallback()
    element.connectedCallback()
    await flush()
    assert.equal(instances.length, 1)
    const first = instances[0]

    element.isConnected = false
    element.disconnectedCallback()
    await flush()
    assert.equal(
      first.removeCalls,
      0,
      'must wait until setup creates the canvas',
    )
    element.isConnected = true
    element.connectedCallback()
    first.setup()
    await flush()
    assert.equal(first.removeCalls, 1)
    assert.equal(
      instances.length,
      1,
      'reconnect must await the old remove promise',
    )

    first.removed.resolve()
    await flush()
    assert.equal(first.canvas, false)
    assert.equal(instances.length, 2)
    const second = instances[1]
    second.setup()
    await element.lifecycle
    assert.equal(second.canvas, true)

    element.isConnected = false
    element.disconnectedCallback()
    element.disconnectedCallback()
    await flush()
    second.removed.resolve()
    await element.lifecycle
    assert.equal(second.removeCalls, 1)
    assert.equal(second.canvas, false)
    assert.deepEqual(errors, [])
  })

  test(`${name}: transient connections do not initialize; remove errors are handled`, async () => {
    const { element, instances, errors } = background(name)
    element.connectedCallback()
    element.isConnected = false
    element.disconnectedCallback()
    await element.lifecycle
    assert.equal(instances.length, 0)

    element.isConnected = true
    element.connectedCallback()
    await flush()
    instances[0].setup()
    await element.lifecycle
    element.isConnected = false
    element.disconnectedCallback()
    await flush()
    instances[0].removed.reject(new Error('remove hook failed'))
    await element.lifecycle
    assert.equal(errors.length, 1)
  })
}
