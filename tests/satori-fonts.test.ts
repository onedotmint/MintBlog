import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import satori from 'satori'
import sharp from 'sharp'

const font = readFileSync(
  new URL(
    'dist/fonts/KaTeX_Main-Regular.woff2',
    import.meta.resolve('katex/package.json'),
  ),
)

test('Satori accepts bundled WOFF2 data and its SVG converts to a 1200x630 PNG', async () => {
  const title = '<script>alert(1)</script> & "MintBlog"'
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { display: 'flex', fontFamily: 'Test', color: '#111' },
        children: title,
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Test', data: font, weight: 400, style: 'normal' }],
    },
  )
  assert.match(svg, /^<svg/)
  assert.doesNotMatch(svg, /<script|onerror=/i)
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  const metadata = await sharp(png).metadata()
  assert.equal(metadata.format, 'png')
  assert.equal(metadata.width, 1200)
  assert.equal(metadata.height, 630)
})

test('OG font configuration and generator agree on WOFF2', () => {
  const config = readFileSync(
    new URL('../astro.config.ts', import.meta.url),
    'utf8',
  )
  const generator = readFileSync(
    new URL('../src/utils/og-image/generator.ts', import.meta.url),
    'utf8',
  )
  assert.match(
    config,
    /cssVariable: '--font-og-sans',[\s\S]*?formats: \['woff2'\]/,
  )
  assert.match(generator, /item\.format === 'woff2'/)
})
