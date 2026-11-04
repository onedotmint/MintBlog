import { SITE } from '../config.ts'

export function GET() {
  const path = [SITE.base, 'sitemap-index.xml'].join('/').replace(/\/+/g, '/')
  const sitemap = new URL(path, SITE.website)
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
