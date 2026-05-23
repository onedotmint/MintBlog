import assert from 'node:assert/strict'
import test from 'node:test'
import { importTsModule } from './import-ts-module.mjs'

const {
  getProjectGroups,
  getProjectsWithDetails,
  normalizeProjectSlug,
  sortProjects,
} = await importTsModule(new URL('../src/utils/project-core.ts', import.meta.url))

function project(slug, groupTitle, groupOrder, order, name, overrides = {}) {
  return {
    slug,
    data: {
      name,
      description: `${name} description`,
      group: {
        title: groupTitle,
        description: `${groupTitle} description`,
        order: groupOrder,
      },
      order,
      tags: ['Astro'],
      ...overrides,
    },
  }
}

test('normalizes project slugs', () => {
  assert.equal(normalizeProjectSlug('tcp-server-lab.mdx'), 'tcp-server-lab')
  assert.equal(normalizeProjectSlug('nginx-static-host.md'), 'nginx-static-host')
})

test('sorts projects by group order, item order, and name', () => {
  const input = [
    project('b', 'Second', 1, 0, 'Beta'),
    project('c', 'First', 0, 1, 'Charlie'),
    project('a', 'First', 0, 0, 'Alpha'),
  ]

  assert.deepEqual(sortProjects(input).map((item) => item.slug), ['a', 'c', 'b'])
  assert.deepEqual(input.map((item) => item.slug), ['b', 'c', 'a'])
})

test('groups projects and assigns list hrefs', () => {
  const groups = getProjectGroups([
    project('list-only', 'Tools', 0, 1, 'List Only'),
    project('external', 'Tools', 0, 2, 'External', { link: '/reading/' }),
    project('detail', 'Labs', 1, 0, 'Detail', { detail: true }),
  ])

  assert.deepEqual(groups.map((group) => group.title), ['Tools', 'Labs'])
  assert.equal(groups[0].items[0].href, undefined)
  assert.equal(groups[0].items[1].href, '/reading/')
  assert.equal(groups[1].items[0].href, '/projects/detail/')
})

test('returns only complete detail projects with static hrefs', () => {
  const projects = [
    project('complete', 'Labs', 0, 0, 'Complete', {
      detail: true,
      summary: 'Summary',
      designNotes: ['Note'],
      links: [],
      retrospective: 'Retrospective',
    }),
    project('incomplete', 'Labs', 0, 1, 'Incomplete', {
      detail: true,
      summary: 'Summary',
    }),
    project('list-only', 'Labs', 0, 2, 'List Only'),
  ]

  assert.deepEqual(getProjectsWithDetails(projects).map((item) => item.href), ['/projects/complete/'])
})
