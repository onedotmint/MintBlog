import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

test('LogoButton renders inline Three-Beat Rhythm SVG and preserves home link', async () => {
  const source = await readFile(
    new URL('../src/components/widgets/LogoButton.astro', import.meta.url),
    'utf8',
  )

  assert.match(source, /href=\{withBasePath\('\/'\)\}/)
  assert.match(source, /aria-label=\{`\$\{SITE\.author\} \/ onedotmint`\}/)
  assert.match(source, /aria-current=/)

  assert.match(source, /viewBox="0 0 64 64"/)
  assert.match(source, /fill="currentColor"/)
  assert.match(source, /aria-hidden="true"/)
  assert.match(source, /focusable="false"/)

  assert.ok(
    source.includes(
      'M13 44C16 30 24 19 37 14C34 19 28 28 21 41C18 42 15 43 13 44Z',
    ),
  )
  assert.ok(
    source.includes(
      'M39 19C45 19 48 23 45 28C42 32 35 34 29 33C34 29 37 24 39 19Z',
    ),
  )
  assert.ok(source.includes('M33 37C39 39 45 43 51 49C45 48 39 45 33 40Z'))

  assert.doesNotMatch(source, /<img\b/)
  assert.doesNotMatch(source, /onedotmint-wordmark\.svg/)
  assert.doesNotMatch(source, /<script\b/)

  for (const id of [
    'mintblog-logo-mask-1',
    'mintblog-logo-mask-2',
    'mintblog-logo-mask-3',
  ]) {
    assert.match(source, new RegExp(`id="${id}"`))
    assert.match(source, new RegExp(`mask="url\\(#${id}\\)"`))
  }

  assert.match(source, /maskUnits="userSpaceOnUse"/)
  assert.match(source, /pathLength="1"/)
  assert.match(source, /stroke-dasharray:\s*1;/)
  assert.match(source, /stroke-dashoffset:\s*0;/)
  assert.match(source, /@media \(prefers-reduced-motion: no-preference\)/)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\), print/)
  assert.match(source, /@keyframes logo-draw/)
  assert.match(
    source,
    /0%\s*\{[^}]*stroke-dashoffset:\s*1;[^}]*stroke-opacity:\s*0;/,
  )
  assert.match(
    source,
    /100%\s*\{[^}]*stroke-dashoffset:\s*0;[^}]*stroke-opacity:\s*1;/,
  )
  assert.match(source, /\b1 both;/)
  assert.doesNotMatch(source, /\binfinite\b/)
})

test('tab icons reuse the static header mark in SVG and ICO formats', async () => {
  const logo = await readFile(
    new URL('../src/components/widgets/LogoButton.astro', import.meta.url),
    'utf8',
  )
  const svg = await readFile(
    new URL('../public/favicon.svg', import.meta.url),
    'utf8',
  )
  const paths = [
    ...logo.matchAll(/<path\s+fill="currentColor"[^>]*\bd="([^"]+)"/g),
  ].map((match) => match[1])
  assert.equal(paths.length, 3)
  assert.deepEqual(
    [...svg.matchAll(/<path\s+d="([^"]+)"/g)].map((match) => match[1]),
    paths,
  )
  assert.match(svg, /prefers-color-scheme: dark/)
  assert.doesNotMatch(svg, /<circle\b|<mask\b|<animate\b/)

  const ico = await readFile(new URL('../public/favicon.ico', import.meta.url))
  assert.equal(ico.readUInt16LE(0), 0)
  assert.equal(ico.readUInt16LE(2), 1)
  assert.equal(ico.readUInt16LE(4), 1)
  assert.equal(ico[6], 32)
  assert.equal(ico[7], 32)
  const offset = ico.readUInt32LE(18)
  assert.equal(ico.readUInt32LE(14), ico.length - offset)
  assert.deepEqual(
    ico.subarray(offset),
    await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer(),
  )
})
