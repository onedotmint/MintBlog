import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const blogDir = join(root, 'src/content/blog')
const readingDir = join(root, 'src/content/reading')
const publicDir = join(root, 'public')
const requiredFrontmatter = ['title', 'date', 'description', 'tags', 'readingTime']
const errors = []

function report(file, message) {
  errors.push(`${relative(root, file)}: ${message}`)
}

function getBlogFiles() {
  if (!existsSync(blogDir)) {
    return []
  }

  return readdirSync(blogDir)
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => join(blogDir, name))
}

function getReadingFiles() {
  if (!existsSync(readingDir)) {
    return []
  }

  return readdirSync(readingDir)
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => join(readingDir, name))
}

function normalizeBlogSlug(file) {
  return file
    .slice(blogDir.length + 1)
    .replace(/\.(md|mdx)$/, '')
}

function normalizeReadingSlug(file) {
  return file
    .slice(readingDir.length + 1)
    .replace(/\.(md|mdx)$/, '')
}

function cleanScalarValue(value) {
  return value.replace(/^['"]|['"]$/g, '')
}

function splitFrontmatter(file, source) {
  if (!source.startsWith('---\n')) {
    report(file, 'missing frontmatter block')
    return undefined
  }

  const end = source.indexOf('\n---', 4)

  if (end === -1) {
    report(file, 'frontmatter block is not closed')
    return undefined
  }

  return {
    frontmatter: source.slice(4, end),
    body: source.slice(end + 4),
  }
}

function parseFrontmatter(frontmatter) {
  const fields = new Map()
  const lines = frontmatter.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const match = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/)

    if (!match) {
      continue
    }

    const [, key, rawValue] = match
    fields.set(key, cleanScalarValue(rawValue.trim()))
  }

  return fields
}

function parseListValue(frontmatter, key) {
  const fields = parseFrontmatter(frontmatter)
  const rawValue = fields.get(key)

  if (!rawValue) {
    const lines = frontmatter.split('\n')
    const keyIndex = lines.findIndex((line) => line.match(new RegExp(`^${key}:\\s*$`)))

    if (keyIndex === -1) {
      return []
    }

    const values = []

    for (const line of lines.slice(keyIndex + 1)) {
      if (line.startsWith('  - ')) {
        values.push(line.slice(4).trim().replace(/^['"]|['"]$/g, ''))
        continue
      }

      if (line.trim() === '') {
        continue
      }

      break
    }

    return values
  }

  const inlineArray = rawValue.match(/^\[(.*)\]$/)

  if (!inlineArray) {
    return []
  }

  return inlineArray[1]
    .split(',')
    .map((tag) => tag.trim().replace(/^['"]|['"]$/g, ''))
}

function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseSeriesSlug(frontmatter) {
  const lines = frontmatter.split('\n')
  const seriesIndex = lines.findIndex((line) => line === 'series:')

  if (seriesIndex === -1) {
    return undefined
  }

  const seriesFields = new Map()

  for (const line of lines.slice(seriesIndex + 1)) {
    if (!line.startsWith('  ')) {
      break
    }

    const match = line.match(/^  ([A-Za-z][A-Za-z0-9]*):\s*(.*)$/)

    if (match) {
      seriesFields.set(match[1], match[2].trim().replace(/^['"]|['"]$/g, ''))
    }
  }

  const slugSource = seriesFields.get('slug') || seriesFields.get('title')

  return slugSource ? normalizeSlug(slugSource) : undefined
}

function getKnownRoutes(blogFiles, readingFiles) {
  const seriesRoutes = blogFiles
    .map((file) => {
      const source = readFileSync(file, 'utf8')
      const parts = splitFrontmatter(file, source)
      const seriesSlug = parts ? parseSeriesSlug(parts.frontmatter) : undefined

      return seriesSlug ? `/blog/series/${seriesSlug}/` : undefined
    })
    .filter(Boolean)

  const readingRoutes = readingFiles.map((file) => `/reading/${normalizeReadingSlug(file)}/`)

  return new Set([
    '/',
    '/about/',
    '/blog/',
    '/blog/series/',
    '/blog/tags/',
    '/projects/',
    '/now/',
    '/reading/',
    ...blogFiles.map((file) => `/blog/${normalizeBlogSlug(file)}/`),
    ...seriesRoutes,
    ...readingRoutes,
  ])
}

function checkFrontmatter(file, frontmatter) {
  const fields = parseFrontmatter(frontmatter)

  for (const key of requiredFrontmatter) {
    if (key === 'tags') {
      continue
    }

    if (!fields.has(key) || fields.get(key) === '') {
      report(file, `missing required frontmatter: ${key}`)
    }
  }

  const tags = parseListValue(frontmatter, 'tags')

  if (tags.length === 0) {
    report(file, 'missing required frontmatter: tags')
    return
  }

  const seenTags = new Set()

  for (const tag of tags) {
    if (!tag) {
      report(file, 'tags cannot contain empty values')
      continue
    }

    const normalized = tag.toLowerCase()

    if (seenTags.has(normalized)) {
      report(file, `duplicate tag: ${tag}`)
      continue
    }

    seenTags.add(normalized)
  }
}

function checkReadingFrontmatter(file, frontmatter, knownRoutes) {
  const fields = parseFrontmatter(frontmatter)
  const requiredKeys = ['title', 'type', 'note']

  for (const key of requiredKeys) {
    if (!fields.has(key) || fields.get(key) === '') {
      report(file, `missing required frontmatter: ${key}`)
    }
  }

  const tags = parseListValue(frontmatter, 'tags')

  if (tags.length > 0) {
    const seenTags = new Set()

    for (const tag of tags) {
      if (!tag) {
        report(file, 'tags cannot contain empty values')
        continue
      }

      const normalized = tag.toLowerCase()

      if (seenTags.has(normalized)) {
        report(file, `duplicate tag: ${tag}`)
        continue
      }

      seenTags.add(normalized)
    }
  }

  const image = fields.get('image')

  if (image && !image.startsWith('/')) {
    report(file, 'image must use a root-relative public path')
    return
  }

  if (image) {
    checkRootRelativeTarget(file, image, knownRoutes)
  }
}

function stripCodeFences(source) {
  return source.replace(/```[\s\S]*?```/g, '')
}

function findRootRelativeTargets(source) {
  const targets = []
  const body = stripCodeFences(source)
  const markdownLinkPattern = /!?\[[^\]]*]\((\/[^)\s#]+)(?:#[^)]+)?\)/g
  const htmlAttrPattern = /\b(?:href|src)=["'](\/[^"'\s#]+)(?:#[^"']*)?["']/g
  let match

  while ((match = markdownLinkPattern.exec(body)) !== null) {
    targets.push(match[1])
  }

  while ((match = htmlAttrPattern.exec(body)) !== null) {
    targets.push(match[1])
  }

  return targets
}

function checkRootRelativeTargets(file, body, knownRoutes) {
  for (const target of findRootRelativeTargets(body)) {
    checkRootRelativeTarget(file, target, knownRoutes)
  }
}

function checkRootRelativeTarget(file, target, knownRoutes) {
  const publicPath = join(publicDir, decodeURIComponent(target))

  if (knownRoutes.has(target) || (existsSync(publicPath) && statSync(publicPath).isFile())) {
    return
  }

  report(file, `missing internal route or public file: ${target}`)
}

const blogFiles = getBlogFiles()
const readingFiles = getReadingFiles()
const knownRoutes = getKnownRoutes(blogFiles, readingFiles)

for (const file of blogFiles) {
  const source = readFileSync(file, 'utf8')
  const parts = splitFrontmatter(file, source)

  if (!parts) {
    continue
  }

  checkFrontmatter(file, parts.frontmatter)
  checkRootRelativeTargets(file, parts.body, knownRoutes)
}

for (const file of readingFiles) {
  const source = readFileSync(file, 'utf8')
  const parts = splitFrontmatter(file, source)

  if (!parts) {
    continue
  }

  checkReadingFrontmatter(file, parts.frontmatter, knownRoutes)
  checkRootRelativeTargets(file, parts.body, knownRoutes)
}

if (errors.length > 0) {
  console.error('[content] failed')

  for (const error of errors) {
    console.error(`[content] ${error}`)
  }

  process.exit(1)
}

console.log(`[content] ok: ${blogFiles.length} blog post(s) checked`)
console.log(`[content] ok: ${readingFiles.length} reading resource(s) checked`)
