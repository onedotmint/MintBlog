import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import type { CollectionEntry } from 'astro:content'
import { groupShorts } from '../src/utils/short-collections.ts'

function override(
  id: string,
  data: Partial<CollectionEntry<'shortCollections'>['data']> = {}
): CollectionEntry<'shortCollections'> {
  return {
    id,
    collection: 'shortCollections',
    data: { title: '', description: '', draft: false, ...data },
  }
}

function post(
  id: string,
  draft = false,
  date = '2026-10-01'
): CollectionEntry<'shorts'> {
  return {
    id,
    collection: 'shorts',
    data: {
      title: id,
      subtitle: '',
      description: '',
      tags: [],
      cover: '',
      coverAlt: '',
      pubDate: new Date(date),
      minutesRead: true,
      radio: false,
      video: false,
      platform: '',
      bgType: false,
      ogImage: false,
      toc: true,
      share: true,
      giscus: true,
      search: true,
      redirect: '',
      draft,
    },
  }
}

test('Shorts derives a collection from the folder name, so a new .md needs no frontmatter', () => {
  const groups = groupShorts(
    [],
    [post('notes/a'), post('生活切片/b'), post('生活切片/c')],
    true
  )

  assert.deepEqual(
    groups.map((group) => [
      group.id,
      group.title,
      group.posts.map((post) => post.id),
    ]),
    [
      ['生活切片', '生活切片', ['生活切片/b', '生活切片/c']],
      ['notes', '随手记', ['notes/a']],
    ]
  )
})

test('root-level Shorts files fall back to the default collection instead of failing', () => {
  const groups = groupShorts([], [post('下雨的周末')], true)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].id, 'notes')
  assert.deepEqual(groups[0].posts.map((p) => p.id), ['下雨的周末'])
})

test('an optional short-collections file overrides title, description and draft', () => {
  const groups = groupShorts(
    [override('notes', { title: '随手记', description: '日常片刻' })],
    [post('notes/a')],
    true
  )
  assert.equal(groups[0].title, '随手记')
  assert.equal(groups[0].description, '日常片刻')
})

test('draft collections hide all their posts and counts in production, while development previews both draft levels', () => {
  const overrides = [override('private', { draft: true })]
  const posts = [
    post('public/visible'),
    post('public/draft', true),
    post('private/hidden'),
  ]

  const production = groupShorts(overrides, posts, true)
  assert.deepEqual(
    production.map((group) => [group.id, group.posts.map((p) => p.id)]),
    [['public', ['public/visible']]]
  )

  assert.equal(
    groupShorts(overrides, posts, false).flatMap((group) => group.posts).length,
    3
  )
})

test('collection pages sort by title, posts newest first, and the reserved route still fails', () => {
  const groups = groupShorts(
    [],
    [
      post('b/old', false, '2026-10-01'),
      post('b/new', false, '2026-10-02'),
      post('a/x'),
    ],
    true
  )
  assert.deepEqual(
    groups.map((group) => [group.id, group.posts.map((p) => p.id)]),
    [
      ['a', ['a/x']],
      ['b', ['b/new', 'b/old']],
    ]
  )

  for (const id of ['collections', 'collections/notes']) {
    assert.throws(() => groupShorts([], [post(id)], true), /reserved/)
  }
})

test('the original Shorts example keeps its root-level URL inside the default collection', () => {
  const id = 'astro-content-collections'
  assert.ok(existsSync(new URL(`../src/content/shorts/${id}.md`, import.meta.url)))
  assert.equal(
    existsSync(new URL(`../src/content/shorts/notes/${id}.md`, import.meta.url)),
    false
  )
  const [group] = groupShorts([], [post(id)], true)
  assert.equal(group.id, 'notes')
  assert.equal(group.posts[0].id, id)
})
