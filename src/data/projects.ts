export interface ProjectItemData {
  name: string
  description: string
  tags: readonly string[]
  link?: string
  detail?: ProjectDetail
}

export interface ProjectDetail {
  slug: string
  summary: string
  background: string
  designNotes: readonly string[]
  links: readonly ProjectLink[]
  retrospective: string
}

export interface ProjectLink {
  label: string
  href: string
}

export type ProjectWithDetail = ProjectItemData & {
  detail: ProjectDetail
  link: string
}

export interface ProjectGroup {
  title: string
  description: string
  items: readonly ProjectItemData[]
}

export const projectGroups: readonly ProjectGroup[] = [
  {
    title: 'Current Focus',
    description: 'Things I am learning right now and keeping close to the terminal.',
    items: [
      {
        name: 'Rust Notes',
        description: 'Small exercises on ownership, error handling, and tooling around cargo.',
        tags: ['Rust', 'Systems', 'Notes'],
      },
      {
        name: 'Build Pipeline Sketches',
        description: 'Drafts for content sync, deploy flow, and static hosting checks.',
        tags: ['Astro', 'CI', 'Deploy'],
        detail: {
          slug: 'build-pipeline-sketches',
          summary: 'Build notes for keeping content sync, static generation, and deployment checks visible.',
          background:
            'This project collects the operational pieces behind the blog: syncing private content, building Astro output, and checking that generated assets stay small.',
          designNotes: [
            'Keep the build path boring: content sync happens before Astro starts, then the generated dist output becomes the deployment artifact.',
            'Make checks local and repeatable so CI and manual publishing use the same commands.',
            'Prefer small Node scripts over extra services for content and budget validation.',
          ],
          links: [
            {
              label: 'Architecture decisions',
              href: '/files/server-checklist.txt',
            },
          ],
          retrospective:
            'The useful part is not automation volume. It is knowing which assumptions the build relies on and making those assumptions fail early.',
        },
      },
    ],
  },
  {
    title: 'Systems Practice',
    description: 'Low-level experiments and service patterns that sharpen backend judgment.',
    items: [
      {
        name: 'TCP Server Lab',
        description: 'A tiny Go server used to study connection handling and logs.',
        tags: ['Go', 'Networking', 'Linux'],
        detail: {
          slug: 'tcp-server-lab',
          summary: 'A small networking exercise focused on connection lifecycle, logging, and failure paths.',
          background:
            'The lab started as a way to make socket behavior less abstract. A small TCP service is enough to study accept loops, connection cleanup, and observability habits.',
          designNotes: [
            'Keep the server small enough that every connection state can be inspected directly.',
            'Use logs to explain lifecycle transitions instead of hiding behavior behind framework defaults.',
            'Treat timeouts and closed connections as first-class cases, not noisy afterthoughts.',
          ],
          links: [
            {
              label: 'Related note',
              href: '/blog/go-tcp-server/',
            },
            {
              label: 'Project image',
              href: '/images/projects/tcp-server.svg',
            },
          ],
          retrospective:
            'The main lesson was that simple network programs are usually debugging exercises. Clear boundaries matter more than clever abstractions.',
        },
      },
      {
        name: 'Nginx Static Host',
        description: 'Configuration notes for serving a generated site from a small VPS.',
        tags: ['Nginx', 'Ops', 'Static'],
        detail: {
          slug: 'nginx-static-host',
          summary: 'Static hosting notes for serving generated pages from a small Linux server.',
          background:
            'This project keeps deployment close to the operating system: build static files, copy them to a server, and let Nginx serve them predictably.',
          designNotes: [
            'Serve generated files directly instead of running an app process in production.',
            'Keep route behavior aligned with Astro trailing-slash output.',
            'Document cache and fallback behavior so deployment changes are easy to review.',
          ],
          links: [
            {
              label: 'Nginx note',
              href: '/blog/linux-nginx-note/',
            },
            {
              label: 'Server checklist',
              href: '/files/server-checklist.txt',
            },
          ],
          retrospective:
            'Static hosting has fewer moving parts, but it still needs explicit decisions around routes, cache headers, and rollback paths.',
        },
      },
    ],
  },
  {
    title: 'Web Tools',
    description: 'Simple public-facing utilities that stay plain and fast.',
    items: [
      {
        name: 'Reading Index',
        description: 'A public index for courses, books, documentation, and technical references.',
        tags: ['Astro', 'MDX', 'Content'],
        link: '/reading/',
      },
      {
        name: 'Project Log',
        description: 'A place to track small experiments without adding app complexity.',
        tags: ['HTML', 'CSS', 'Writing'],
      },
    ],
  },
]

function hasProjectDetail(project: ProjectItemData): project is ProjectItemData & { detail: ProjectDetail } {
  return Boolean(project.detail)
}

export function getProjectsWithDetails(): ProjectWithDetail[] {
  return projectGroups.flatMap((group) =>
    group.items
      .filter(hasProjectDetail)
      .map((project) => ({
        ...project,
        link: project.link || `/projects/${project.detail.slug}/`,
      })),
  )
}
