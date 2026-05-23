import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import {
  getProjectGroups,
  getProjectsWithDetails,
  normalizeProjectSlug,
  sortProjects,
} from './project-core'
import type {
  ProjectGroup as ProjectGroupCore,
  ProjectItemData as ProjectItemDataCore,
  ProjectLink,
  ProjectWithDetail as ProjectWithDetailCore,
} from './project-core'

export {
  getProjectGroups,
  getProjectsWithDetails,
  hasProjectDetail,
  normalizeProjectSlug,
  sortProjects,
} from './project-core'

export type ProjectEntry = CollectionEntry<'projects'>
export type ProjectItemData = ProjectItemDataCore<ProjectEntry['data']> & { entry: ProjectEntry }
export type ProjectWithDetail = ProjectWithDetailCore<ProjectEntry['data']> & { entry: ProjectEntry }
export type ProjectGroup = ProjectGroupCore<ProjectItemData>
export type { ProjectLink }

export function toProject(entry: ProjectEntry): ProjectItemData {
  const slug = normalizeProjectSlug(entry.slug)

  return {
    entry,
    slug,
    data: entry.data,
  }
}

export async function getProjects() {
  const entries = (await getCollection('projects')) as ProjectEntry[]

  return sortProjects(entries.map(toProject))
}

export async function getGroupedProjects() {
  return getProjectGroups(await getProjects())
}

export async function getDetailedProjects() {
  return getProjectsWithDetails(await getProjects())
}
