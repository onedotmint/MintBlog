import type { Site, Ui, Features } from './types'

export const SITE: Site = {
  website: 'https://onedotmint.github.io/',
  base: '/',
  title: '一点薄荷',
  description: '一个安静的技术笔记本，记录文章、学习笔记、系统实验和小作品。',
  author: '一点薄荷',
  lang: 'zh-CN',
  ogLocale: 'zh_CN',
  imageDomains: [],
}

export const UI: Ui = {
  internalNavs: [
    {
      path: '/blog',
      title: 'Writing',
      displayMode: 'alwaysText',
      text: 'Writing',
    },
    {
      path: '/projects',
      title: 'Projects',
      displayMode: 'alwaysText',
      text: 'Projects',
    },
    {
      path: '/shorts',
      title: 'Shorts',
      displayMode: 'alwaysText',
      text: 'Shorts',
    },
    {
      path: '/links',
      title: 'Links',
      displayMode: 'alwaysText',
      text: 'Links',
    },
  ],
  socialLinks: [
    {
      link: 'https://github.com/onedotmint',
      title: '一点薄荷的 GitHub',
      displayMode: 'alwaysIcon',
      icon: 'i-uil-github-alt',
    },
  ],
  navBarLayout: {
    left: [],
    right: [
      'internalNavs',
      'hr',
      'socialLinks',
      'hr',
      'searchButton',
      'themeButton',
      'rssLink',
    ],
    mergeOnMobile: true,
  },
  tabbedLayoutTabs: [
    { title: '更新记录', path: '/changelog' },
    { title: '外部订阅', path: '/feeds' },
    { title: '记录', path: '/streams' },
  ],
  postView: {
    postMetaStyle: 'minimal',
    useCoverAltAsCaption: true,
  },
  groupView: {
    maxGroupColumns: 3,
    showGroupItemColorOnHover: true,
  },
  githubView: {
    monorepos: [],
    mainLogoOverrides: [],
    subLogoMatches: [],
  },
  externalLink: {
    newTab: false,
    cursorType: '',
    showNewTabIcon: false,
  },
}

/**
 * Globally controls whether to enable special features:
 *  - Set to `false` or `[false, {...}]` to disable the feature.
 *  - Set to `[true, {...}]` to enable and configure the feature.
 */
export const FEATURES: Features = {
  slideEnterAnim: [true, { enterStep: 80 }],
  ogImage: false,
  toc: [
    true,
    {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
      displayPosition: 'right',
      displayMode: 'content',
    },
  ],
  share: false,
  giscus: false,
  search: false,
  tag: [
    true,
    {
      displayPosition: 'right',
      displayMode: 'content',
      filterMode: 'AND',
    },
  ],
}
