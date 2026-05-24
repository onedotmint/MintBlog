export interface TalkAction {
  label: string
  href: string
}

export interface TalkItem {
  title: string
  event: string
  date: string
  location: string
  summary: string
  speakerHref: string
  actions: readonly TalkAction[]
}

export interface TalkGroup {
  label: string
  description: string
  talks: readonly TalkItem[]
}

export const talkGroups = [
  {
    label: 'Notes',
    description: 'Short technical sessions that can turn into longer articles.',
    talks: [
      {
        title: 'Static sites as durable engineering notes',
        event: 'Local developer study group',
        date: '2026-04-18',
        location: 'Online',
        summary: 'A practical walk through content collections, build checks, and keeping a personal site inspectable.',
        speakerHref: '/about/',
        actions: [
          { label: 'Related notes', href: '/blog/' },
          { label: 'Projects', href: '/projects/' },
        ],
      },
      {
        title: 'Small backend labs that teach operational habits',
        event: 'Systems learning log',
        date: '2026-03-09',
        location: 'Online',
        summary: 'How tiny TCP, Nginx, and deployment exercises can expose the parts of production systems worth practicing.',
        speakerHref: '/about/',
        actions: [
          { label: 'Project log', href: '/projects/' },
          { label: 'Reading', href: '/reading/' },
        ],
      },
    ],
  },
  {
    label: 'Drafts',
    description: 'Ideas kept visible before they become a full post or project writeup.',
    talks: [
      {
        title: 'Designing quiet interfaces for technical archives',
        event: 'Draft outline',
        date: '2026-02-14',
        location: 'Notes',
        summary: 'A design note on dense lists, low-contrast surfaces, and why developer sites do not need product-page drama.',
        speakerHref: '/about/',
        actions: [
          { label: 'About', href: '/about/' },
          { label: 'Now', href: '/now/' },
        ],
      },
    ],
  },
] satisfies readonly TalkGroup[]
