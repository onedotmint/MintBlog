export interface SiteIdentity {
  siteName: string
  ownerName: string
  defaultTitle: string
  defaultDescription: string
  shortIntro: string
  aboutIntro: string
  githubUrl: string
  emailAddress: string
  canonicalOrigin?: string
}

export const siteIdentity = {
  siteName: 'Jeff Tim',
  ownerName: 'Jeff Tim',
  defaultTitle: 'Jeff Tim',
  defaultDescription: 'Quiet notes on backend systems, small tools, and the path from learning to shipping.',
  shortIntro: 'Notes on backend systems, small tools, and the habits that make them easier to ship.',
  aboutIntro: 'Computer science student. Backend and systems learner. I keep a public log of the small things I build and the notes that help me reason about them.',
  githubUrl: 'https://github.com/jefftim',
  emailAddress: 'jeff@example.com',
  canonicalOrigin: '',
} satisfies SiteIdentity
