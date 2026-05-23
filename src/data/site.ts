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

const developmentCanonicalOrigin = 'http://localhost:4321'

export function getSiteOrigin() {
  return (import.meta.env.PUBLIC_SITE_ORIGIN || siteIdentity.canonicalOrigin || developmentCanonicalOrigin).replace(/\/+$/, '')
}

export function toAbsoluteUrl(path: string) {
  return new URL(path, `${getSiteOrigin()}/`).toString()
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
