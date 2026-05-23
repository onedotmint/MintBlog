import assert from 'node:assert/strict'
import test from 'node:test'
import { importTsModule } from './import-ts-module.mjs'

const { buildArticleSeoMetadata, serializeJsonLd } = await importTsModule(new URL('../src/utils/seo.ts', import.meta.url))

test('builds article SEO metadata from published date, updated date, and tags', () => {
  const metadata = buildArticleSeoMetadata({
    title: 'Go TCP Server',
    description: 'Notes on a small TCP server.',
    canonicalUrl: 'https://example.com/blog/go-tcp-server/',
    imageUrl: 'https://example.com/social-card.png',
    publishedAt: new Date('2026-05-20T00:00:00.000Z'),
    modifiedAt: new Date('2026-05-23T00:00:00.000Z'),
    tags: [' Go ', 'Systems'],
    authorName: 'Jeff Tim',
    siteName: 'Jeff Tim',
    siteUrl: 'https://example.com/',
  })

  assert.equal(metadata.publishedTime, '2026-05-20T00:00:00.000Z')
  assert.equal(metadata.modifiedTime, '2026-05-23T00:00:00.000Z')
  assert.equal(metadata.keywords, 'Go, Systems')
  assert.deepEqual(metadata.tags, ['Go', 'Systems'])
  assert.equal(metadata.jsonLd['@type'], 'Article')
  assert.equal(metadata.jsonLd.headline, 'Go TCP Server')
  assert.equal(metadata.jsonLd.url, 'https://example.com/blog/go-tcp-server/')
  assert.deepEqual(metadata.jsonLd.image, ['https://example.com/social-card.png'])
  assert.equal(metadata.jsonLd.datePublished, '2026-05-20T00:00:00.000Z')
  assert.equal(metadata.jsonLd.dateModified, '2026-05-23T00:00:00.000Z')
  assert.deepEqual(metadata.jsonLd.author, { '@type': 'Person', name: 'Jeff Tim' })
  assert.equal(metadata.jsonLd.keywords, 'Go, Systems')
})

test('omits article modified meta when updated date is not later than publish date', () => {
  const metadata = buildArticleSeoMetadata({
    title: 'Original Post',
    description: 'Original notes.',
    canonicalUrl: 'https://example.com/blog/original-post/',
    imageUrl: 'https://example.com/social-card.png',
    publishedAt: new Date('2026-05-20T00:00:00.000Z'),
    modifiedAt: new Date('2026-05-20T00:00:00.000Z'),
    tags: [],
    authorName: 'Jeff Tim',
    siteName: 'Jeff Tim',
    siteUrl: 'https://example.com/',
  })

  assert.equal(metadata.modifiedTime, undefined)
  assert.equal(metadata.keywords, undefined)
  assert.equal(metadata.jsonLd.dateModified, '2026-05-20T00:00:00.000Z')
  assert.equal('keywords' in metadata.jsonLd, false)
})

test('escapes JSON-LD for safe inline script output', () => {
  const json = serializeJsonLd({
    headline: 'Use </script> & keep going',
  })

  assert(!json.includes('</script>'))
  assert(!json.includes('&'))
  assert(json.includes('\\u003c/script\\u003e'))
  assert(json.includes('\\u0026'))
})
