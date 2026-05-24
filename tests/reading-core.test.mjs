import assert from 'node:assert/strict'
import test from 'node:test'
import { importTsModule } from './import-ts-module.mjs'

const {
  getReadingResourceExternalHref,
  getReadingResourceGroups,
  getReadingTypeSectionId,
  isReadingResourceType,
  normalizeReadingSlug,
  readingTypeValues,
  sortReadingResources,
} = await importTsModule(new URL('../src/utils/reading-core.ts', import.meta.url))

function resource(slug, type, title, url) {
  return {
    slug,
    href: `/reading/${slug}/`,
    data: {
      title,
      type,
      url,
    },
  }
}

test('normalizes reading slugs', () => {
  assert.equal(normalizeReadingSlug('intro-to-astro.mdx'), 'intro-to-astro')
  assert.equal(normalizeReadingSlug('http-reference.md'), 'http-reference')
})

test('builds stable reading type section ids', () => {
  assert.equal(getReadingTypeSectionId('Documentation'), 'reading-documentation')
  assert.equal(getReadingTypeSectionId('Case Study'), 'reading-case-study')
})

test('defines accepted reading type values', () => {
  assert.deepEqual(readingTypeValues, ['Course', 'Book', 'Documentation', 'Reference'])
  assert.equal(isReadingResourceType('Book'), true)
  assert.equal(isReadingResourceType('book'), false)
})

test('sorts resources by known type order and title', () => {
  const resources = [
    resource('z', 'Reference', 'Zeta'),
    resource('a', 'Course', 'Alpha'),
    resource('d', 'Documentation', 'Delta'),
    resource('b', 'Book', 'Beta'),
  ]

  assert.deepEqual(sortReadingResources(resources).map((item) => item.slug), ['a', 'b', 'd', 'z'])
})

test('groups resources after applying sort order', () => {
  const resources = [
    resource('ref', 'Reference', 'HTTP'),
    resource('book', 'Book', 'DDIA'),
    resource('doc', 'Documentation', 'Astro'),
  ]

  const groups = getReadingResourceGroups(resources)

  assert.deepEqual(groups.map((group) => group.type), ['Book', 'Documentation', 'Reference'])
  assert.deepEqual(groups.map((group) => group.href), ['#reading-book', '#reading-documentation', '#reading-reference'])
  assert.deepEqual(groups.map((group) => group.resources[0]?.slug), ['book', 'doc', 'ref'])
})

test('returns only safe external http urls', () => {
  assert.equal(getReadingResourceExternalHref(resource('safe', 'Reference', 'MDN', ' https://developer.mozilla.org ')), 'https://developer.mozilla.org/')
  assert.equal(getReadingResourceExternalHref(resource('unsafe', 'Reference', 'Script', 'javascript:alert(1)')), undefined)
  assert.equal(getReadingResourceExternalHref(resource('relative', 'Reference', 'Local', '/blog/')), undefined)
})
