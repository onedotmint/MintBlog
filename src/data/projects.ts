export interface ProjectItemData {
  name: string
  description: string
  tags: string[]
  link?: string
}

export interface ProjectGroup {
  title: string
  description: string
  items: ProjectItemData[]
}

export const projectGroups = [
  {
    title: 'Current Focus',
    description: 'Things I am learning right now and keeping close to the terminal.',
    items: [
      {
        name: 'Rust Notes',
        description: 'Small exercises on ownership, error handling, and tooling around cargo.',
        tags: ['Rust', 'Systems', 'Notes'],
        link: '#',
      },
      {
        name: 'Build Pipeline Sketches',
        description: 'Drafts for content sync, deploy flow, and static hosting checks.',
        tags: ['Astro', 'CI', 'Deploy'],
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
        link: '#',
      },
      {
        name: 'Nginx Static Host',
        description: 'Configuration notes for serving a generated site from a small VPS.',
        tags: ['Nginx', 'Ops', 'Static'],
      },
    ],
  },
  {
    title: 'Web Tools',
    description: 'Simple public-facing utilities that stay plain and fast.',
    items: [
      {
        name: 'Reading Index',
        description: 'A compact collection of blog indexes, notes, and file links.',
        tags: ['Astro', 'MDX', 'Content'],
        link: '#',
      },
      {
        name: 'Project Log',
        description: 'A place to track small experiments without adding app complexity.',
        tags: ['HTML', 'CSS', 'Writing'],
      },
    ],
  },
] satisfies readonly ProjectGroup[]
