export interface ProjectGroupData {
  title: string
  description: string
  order: number
}

export interface ProjectLink {
  label: string
  href: string
}

export const projectStatusValues = ['Active', 'Done', 'Paused', 'Experiment'] as const

export type ProjectStatus = (typeof projectStatusValues)[number]

export interface ProjectDataShape {
  name: string
  description: string
  group: ProjectGroupData
  order: number
  tags: readonly string[]
  status: ProjectStatus
  link?: string
  detail?: boolean
  summary?: string
  designNotes?: readonly string[]
  links?: readonly ProjectLink[]
  retrospective?: string
}

export interface ProjectCore<TData extends ProjectDataShape = ProjectDataShape> {
  slug: string
  href?: string
  data: TData
}

export type ProjectItemData<TData extends ProjectDataShape = ProjectDataShape> = ProjectCore<TData>

export interface ProjectWithDetail<TData extends ProjectDataShape = ProjectDataShape> extends ProjectCore<TData> {
  href: string
  data: TData & {
    detail: true
    summary: string
    designNotes: readonly string[]
    links: readonly ProjectLink[]
    retrospective: string
  }
}

export interface ProjectGroup<TProject extends ProjectCore = ProjectCore> {
  title: string
  description: string
  order: number
  items: TProject[]
}

export function normalizeProjectSlug(slug: string) {
  return slug.replace(/\.(md|mdx)$/, '')
}

export function getProjectHref<TProject extends ProjectCore>(project: TProject) {
  return project.data.link || (project.data.detail ? `/projects/${project.slug}/` : undefined)
}

export function toProjectWithHref<TProject extends ProjectCore>(project: TProject): TProject {
  return {
    ...project,
    href: getProjectHref(project),
  }
}

export function sortProjects<TProject extends ProjectCore>(projects: readonly TProject[]) {
  return [...projects].sort((left, right) => {
    if (left.data.group.order !== right.data.group.order) {
      return left.data.group.order - right.data.group.order
    }

    if (left.data.order !== right.data.order) {
      return left.data.order - right.data.order
    }

    return left.data.name.localeCompare(right.data.name)
  })
}

export function getProjectGroups<TProject extends ProjectCore>(projects: readonly TProject[]) {
  const groupsByTitle = new Map<string, ProjectGroup<TProject>>()

  for (const project of sortProjects(projects).map(toProjectWithHref)) {
    const existing = groupsByTitle.get(project.data.group.title)

    if (existing) {
      existing.items.push(project)
      continue
    }

    groupsByTitle.set(project.data.group.title, {
      title: project.data.group.title,
      description: project.data.group.description,
      order: project.data.group.order,
      items: [project],
    })
  }

  return [...groupsByTitle.values()].sort((left, right) => left.order - right.order)
}

export function hasProjectDetail<TProject extends ProjectCore>(project: TProject): project is TProject & ProjectWithDetail<TProject['data']> {
  return Boolean(
    project.data.detail &&
      project.data.summary &&
      project.data.designNotes &&
      project.data.links &&
      project.data.retrospective,
  )
}

export function getProjectsWithDetails<TProject extends ProjectCore>(projects: readonly TProject[]) {
  return sortProjects(projects)
    .filter(hasProjectDetail)
    .map((project) => ({
      ...project,
      href: `/projects/${project.slug}/`,
    }))
}
