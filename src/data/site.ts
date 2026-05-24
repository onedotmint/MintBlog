export interface SiteIdentity {
  siteName: string
  ownerName: string
  defaultTitle: string
  defaultDescription: string
  shortIntro: string
  aboutIntro: string
  githubUrl: string
  emailAddress?: string
  socialImagePath: string
  socialImageAlt: string
  canonicalOrigin?: string
}

const developmentCanonicalOrigin = 'http://localhost:4321'

export function getSiteOrigin() {
  const env = import.meta.env as ImportMeta['env'] | undefined

  return (env?.PUBLIC_SITE_ORIGIN || siteIdentity.canonicalOrigin || developmentCanonicalOrigin).replace(/\/+$/, '')
}

export function toAbsoluteUrl(path: string) {
  return new URL(path, `${getSiteOrigin()}/`).toString()
}

export const siteIdentity: SiteIdentity = {
  siteName: 'Jeff Tim',
  ownerName: 'Jeff Tim',
  defaultTitle: 'Jeff Tim',
  defaultDescription: 'Independent developer notes on backend systems, open-source maintenance, and small design-minded tools.',
  shortIntro: 'Independent developer and open-source maintainer writing about backend systems, small tools, and the design details that make software easier to keep.',
  aboutIntro: 'I build static-first tools, backend experiments, and public notes for the parts of software that benefit from being inspectable. This site is the working archive.',
  githubUrl: 'https://github.com/jefftim',
  socialImagePath: '/social-card.png',
  socialImageAlt: 'Jeff Tim personal blog preview card',
  canonicalOrigin: '',
}
