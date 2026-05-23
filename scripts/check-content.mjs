import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const requiredFrontmatter = ['title', 'date', 'description', 'tags', 'readingTime']

function createContext(options = {}) {
  const root = options.root ?? defaultRoot

  return {
    root,
    blogDir: options.blogDir ?? join(root, 'src/content/blog'),
    readingDir: options.readingDir ?? join(root, 'src/content/reading'),
    publicDir: options.publicDir ?? join(root, 'public'),
    errors: [],
  }
}

function report(context, file, message) {
  context.errors.push(`${relative(context.root, file)}: ${message}`)
}

function getBlogFiles(context) {
  if (!existsSync(context.blogDir)) {
    return []
  }

  return readdirSync(context.blogDir)
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => join(context.blogDir, name))
}

function getReadingFiles(context) {
  if (!existsSync(context.readingDir)) {
    return []
  }

  return readdirSync(context.readingDir)
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => join(context.readingDir, name))
}

function normalizeBlogSlug(context, file) {
  return file
    .slice(context.blogDir.length + 1)
    .replace(/\.(md|mdx)$/, '')
}

function normalizeReadingSlug(context, file) {
  return file
    .slice(context.readingDir.length + 1)
    .replace(/\.(md|mdx)$/, '')
}

function cleanScalarValue(value) {
  return value.replace(/^['"]|['"]$/g, '')
}

function splitFrontmatter(context, file, source) {
  if (!source.startsWith('---\n')) {
    report(context, file, 'missing frontmatter block')
    return undefined
  }

  const end = source.indexOf('\n---', 4)

  if (end === -1) {
    report(context, file, 'frontmatter block is not closed')
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

function getKnownRoutes(context, blogFiles, readingFiles) {
  const seriesRoutes = blogFiles
    .map((file) => {
      const source = readFileSync(file, 'utf8')
      const parts = splitFrontmatter(context, file, source)
      const seriesSlug = parts ? parseSeriesSlug(parts.frontmatter) : undefined

      return seriesSlug ? `/blog/series/${seriesSlug}/` : undefined
    })
    .filter(Boolean)

  const readingRoutes = readingFiles.map((file) => `/reading/${normalizeReadingSlug(context, file)}/`)

  return new Set([
    '/',
    '/about/',
    '/blog/',
    '/blog/series/',
    '/blog/tags/',
    '/projects/',
    '/now/',
    '/reading/',
    ...blogFiles.map((file) => `/blog/${normalizeBlogSlug(context, file)}/`),
    ...seriesRoutes,
    ...readingRoutes,
  ])
}

function checkFrontmatter(context, file, frontmatter) {
  const fields = parseFrontmatter(frontmatter)

  for (const key of requiredFrontmatter) {
    if (key === 'tags') {
      continue
    }

    if (!fields.has(key) || fields.get(key) === '') {
      report(context, file, `missing required frontmatter: ${key}`)
    }
  }

  const tags = parseListValue(frontmatter, 'tags')

  if (tags.length === 0) {
    report(context, file, 'missing required frontmatter: tags')
    return
  }

  const seenTags = new Set()

  for (const tag of tags) {
    if (!tag) {
      report(context, file, 'tags cannot contain empty values')
      continue
    }

    const normalized = tag.toLowerCase()

    if (seenTags.has(normalized)) {
      report(context, file, `duplicate tag: ${tag}`)
      continue
    }

    seenTags.add(normalized)
  }
}

function checkReadingFrontmatter(context, file, frontmatter, knownRoutes) {
  const fields = parseFrontmatter(frontmatter)
  const requiredKeys = ['title', 'type', 'note']

  for (const key of requiredKeys) {
    if (!fields.has(key) || fields.get(key) === '') {
      report(context, file, `missing required frontmatter: ${key}`)
    }
  }

  const tags = parseListValue(frontmatter, 'tags')

  if (tags.length > 0) {
    const seenTags = new Set()

    for (const tag of tags) {
      if (!tag) {
        report(context, file, 'tags cannot contain empty values')
        continue
      }

      const normalized = tag.toLowerCase()

      if (seenTags.has(normalized)) {
        report(context, file, `duplicate tag: ${tag}`)
        continue
      }

      seenTags.add(normalized)
    }
  }

  const image = fields.get('image')

  if (image && !image.startsWith('/')) {
    report(context, file, 'image must use a root-relative public path')
    return
  }

  if (image) {
    checkRootRelativeTarget(context, file, image, knownRoutes)
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

function checkRootRelativeTargets(context, file, body, knownRoutes) {
  for (const target of findRootRelativeTargets(body)) {
    checkRootRelativeTarget(context, file, target, knownRoutes)
  }
}

function checkRootRelativeTarget(context, file, target, knownRoutes) {
  const publicPath = join(context.publicDir, decodeURIComponent(target))

  if (knownRoutes.has(target) || (existsSync(publicPath) && statSync(publicPath).isFile())) {
    return
  }

  report(context, file, `missing internal route or public file: ${target}`)
}

export function validateContent(options = {}) {
  const context = createContext(options)
  const blogFiles = getBlogFiles(context)
  const readingFiles = getReadingFiles(context)
  const knownRoutes = getKnownRoutes(context, blogFiles, readingFiles)

  for (const file of blogFiles) {
    const source = readFileSync(file, 'utf8')
    const parts = splitFrontmatter(context, file, source)

    if (!parts) {
      continue
    }

    checkFrontmatter(context, file, parts.frontmatter)
    checkRootRelativeTargets(context, file, parts.body, knownRoutes)
  }

  for (const file of readingFiles) {
    const source = readFileSync(file, 'utf8')
    const parts = splitFrontmatter(context, file, source)

    if (!parts) {
      continue
    }

    checkReadingFrontmatter(context, file, parts.frontmatter, knownRoutes)
    checkRootRelativeTargets(context, file, parts.body, knownRoutes)
  }

  return {
    blogCount: blogFiles.length,
    readingCount: readingFiles.length,
    errors: context.errors,
  }
}

export function runContentCheck(options = {}) {
  const result = validateContent(options)

  if (result.errors.length > 0) {
    console.error('[content] failed')

    for (const error of result.errors) {
      console.error(`[content] ${error}`)
    }

    return 1
  }

  console.log(`[content] ok: ${result.blogCount} blog post(s) checked`)
  console.log(`[content] ok: ${result.readingCount} reading resource(s) checked`)

  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runContentCheck())
}
