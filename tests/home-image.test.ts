import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('the home illustration reserves its verified aspect ratio without advertising a missing viewer', () => {
  const source = readFileSync(
    new URL('../src/content/home/index.md', import.meta.url),
    'utf8',
  )
  const image = source.match(/<img\b[\s\S]*?\/>/)?.[0]
  assert.ok(image)
  assert.match(image, /alt="[^"]+"/)
  assert.match(image, /width="1024"/)
  assert.match(image, /height="509"/)
  assert.match(image, /class="no-zoom"/)
  assert.match(image, /max-width: 100%/)
  assert.match(image, /height: auto/)
  assert.doesNotMatch(image, /zoom:/)
})
