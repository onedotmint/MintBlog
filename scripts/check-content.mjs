import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const requiredFrontmatter = ['title', 'date', 'description', 'tags', 'readingTime']
const minuteReadingTimePattern = /^[1-9]\d*\s+min$/
export const readingTypeValues = ['Course', 'Book', 'Documentation', 'Reference']
const readingTypeSet = new Set(readingTypeValues)
export const projectStatusValues = ['Active', 'Done', 'Paused', 'Experiment']
const projectStatusSet = new Set(projectStatusValues)

function createContext(options = {}) {
  const root = options.root ?? defaultRoot

  return {
    root,
    blogDir: options.blogDir ?? join(root, 'src/content/blog'),
    readingDir: options.readingDir ?? join(root, 'src/content/reading'),
    projectsDir: options.projectsDir ?? join(root, 'src/content/projects'),
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

function getProjectFiles(context) {
  if (!existsSync(context.projectsDir)) {
    return []
  }

  return readdirSync(context.projectsDir)
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => join(context.projectsDir, name))
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

function normalizeProjectSlug(context, file) {
  return file
    .slice(context.projectsDir.length + 1)
    .replace(/\.(md|mdx)$/, '')
}

function cleanScalarValue(value) {
  const trimmed = value.trim()
  const quote = trimmed[0]

  if ((quote === '"' || quote === "'") && trimmed.at(-1) === quote) {
    return trimmed.slice(1, -1).replace(new RegExp(`\\\\${quote}`, 'g'), quote)
  }

  return trimmed
}

function isBlankValue(value) {
  return value === undefined || value.trim() === ''
}

function splitTopLevelCommaValues(value) {
  const values = []
  let current = ''
  let quote = ''
  let escaped = false

  for (const char of value) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (quote && char === '\\') {
      current += char
      escaped = true
      continue
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? '' : char
      current += char
      continue
    }

    if (char === ',' && !quote) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (current.trim() || value.endsWith(',')) {
    values.push(current.trim())
  }

  return values
}

function splitKeyValue(value) {
  let quote = ''
  let escaped = false

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (quote && char === '\\') {
      escaped = true
      continue
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? '' : char
      continue
    }

    if (char === ':' && !quote) {
      return [value.slice(0, index).trim(), value.slice(index + 1).trim()]
    }
  }

  return undefined
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
    fields.set(key, cleanScalarValue(rawValue))
  }

  return fields
}

function getTopLevelField(frontmatter, key) {
  const lines = frontmatter.split('\n')
  const fieldPattern = new RegExp(`^${key}:\\s*(.*)$`)

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(fieldPattern)

    if (match) {
      return {
        index,
        rawValue: match[1].trim(),
      }
    }
  }

  return undefined
}

function parseInlineArray(rawValue) {
  const match = rawValue.match(/^\[(.*)\]$/)

  if (!match) {
    return undefined
  }

  const inner = match[1].trim()

  if (!inner) {
    return []
  }

  return splitTopLevelCommaValues(inner).map(cleanScalarValue)
}

function parseBlockArray(lines, keyIndex) {
  const values = []

  for (const line of lines.slice(keyIndex + 1)) {
    if (line.trim() === '') {
      continue
    }

    if (!line.startsWith(' ')) {
      break
    }

    const item = line.match(/^\s*-\s*(.*)$/)

    if (!item) {
      continue
    }

    values.push(cleanScalarValue(item[1]))
  }

  return values
}

function parseListValue(frontmatter, key) {
  const field = getTopLevelField(frontmatter, key)

  if (!field) {
    return []
  }

  const inlineArray = parseInlineArray(field.rawValue)

  if (inlineArray) {
    return inlineArray
  }

  if (field.rawValue !== '') {
    return []
  }

  return parseBlockArray(frontmatter.split('\n'), field.index)
}

function parseInlineObject(rawValue) {
  const match = rawValue.match(/^\{(.*)\}$/)

  if (!match) {
    return undefined
  }

  const fields = new Map()

  for (const entry of splitTopLevelCommaValues(match[1])) {
    const parts = splitKeyValue(entry)

    if (!parts) {
      continue
    }

    fields.set(cleanScalarValue(parts[0]), cleanScalarValue(parts[1]))
  }

  return fields
}

function parseIndentedObject(lines, keyIndex) {
  const fields = new Map()

  for (const line of lines.slice(keyIndex + 1)) {
    if (line.trim() === '') {
      continue
    }

    if (!line.startsWith(' ')) {
      break
    }

    const match = line.match(/^\s+([A-Za-z][A-Za-z0-9]*):\s*(.*)$/)

    if (match) {
      fields.set(match[1], cleanScalarValue(match[2]))
    }
  }

  return fields
}

function parseBlockObjectList(frontmatter, key) {
  const field = getTopLevelField(frontmatter, key)

  if (!field || field.rawValue !== '') {
    return []
  }

  const values = []
  let current

  for (const line of frontmatter.split('\n').slice(field.index + 1)) {
    if (line.trim() === '') {
      continue
    }

    if (!line.startsWith(' ')) {
      break
    }

    const item = line.match(/^\s*-\s*(.*)$/)

    if (item) {
      current = new Map()
      values.push(current)

      if (item[1].trim() !== '') {
        const parts = splitKeyValue(item[1])

        if (parts) {
          current.set(cleanScalarValue(parts[0]), cleanScalarValue(parts[1]))
        }
      }

      continue
    }

    const match = line.match(/^\s+([A-Za-z][A-Za-z0-9]*):\s*(.*)$/)

    if (match && current) {
      current.set(match[1], cleanScalarValue(match[2]))
    }
  }

  return values
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
  const series = getTopLevelField(frontmatter, 'series')

  if (!series) {
    return undefined
  }

  const seriesFields = parseInlineObject(series.rawValue) ?? parseIndentedObject(lines, series.index)

  const slugSource = seriesFields.get('slug') || seriesFields.get('title')

  return slugSource ? normalizeSlug(slugSource) : undefined
}

function parsePositiveInteger(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    return undefined
  }

  return Number(value)
}

function parseNonnegativeInteger(value) {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    return undefined
  }

  return Number(value)
}

function parseDateValue(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return undefined
  }

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return undefined
  }

  return date
}

function hasBodyContent(body) {
  return body.trim() !== ''
}

function isExternalHttpUrl(value) {
  return value.startsWith('https://') || value.startsWith('http://')
}

function checkHttpOrRootRelativeTarget(context, file, field, value, knownRoutes) {
  if (isExternalHttpUrl(value)) {
    return
  }

  if (!value.startsWith('/')) {
    report(context, file, `${field} must be http(s) or a root-relative internal target`)
    return
  }

  checkRootRelativeTarget(context, file, value, knownRoutes)
}

function getKnownRoutes(context, blogFiles, readingFiles, projectFiles) {
  const seriesRoutes = blogFiles
    .map((file) => {
      const source = readFileSync(file, 'utf8')
      const parts = splitFrontmatter(context, file, source)
      const seriesSlug = parts ? parseSeriesSlug(parts.frontmatter) : undefined

      return seriesSlug ? `/blog/series/${seriesSlug}/` : undefined
    })
    .filter(Boolean)

  const readingRoutes = readingFiles.map((file) => `/reading/${normalizeReadingSlug(context, file)}/`)
  const projectRoutes = projectFiles
    .filter((file) => {
      const source = readFileSync(file, 'utf8')
      const parts = splitFrontmatter(context, file, source)
      const fields = parts ? parseFrontmatter(parts.frontmatter) : new Map()

      return fields.get('detail') === 'true'
    })
    .map((file) => `/projects/${normalizeProjectSlug(context, file)}/`)

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
    ...projectRoutes,
  ])
}

function checkFrontmatter(context, file, frontmatter) {
  const fields = parseFrontmatter(frontmatter)

  for (const key of requiredFrontmatter) {
    if (key === 'tags') {
      continue
    }

    if (isBlankValue(fields.get(key))) {
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

  const date = fields.get('date')
  const parsedDate = date ? parseDateValue(date) : undefined

  if (date && !parsedDate) {
    report(context, file, 'date must use YYYY-MM-DD')
  }

  const updatedAt = fields.get('updatedAt')
  const parsedUpdatedAt = updatedAt ? parseDateValue(updatedAt) : undefined

  if (updatedAt && !parsedUpdatedAt) {
    report(context, file, 'updatedAt must use YYYY-MM-DD')
  }

  if (parsedDate && parsedUpdatedAt && parsedUpdatedAt < parsedDate) {
    report(context, file, 'updatedAt must not be earlier than date')
  }

  const readingTime = fields.get('readingTime')

  if (readingTime && !minuteReadingTimePattern.test(readingTime)) {
    report(context, file, 'readingTime must use minutes format like "4 min"')
  }

  const series = getTopLevelField(frontmatter, 'series')
  const seriesFields = series ? parseInlineObject(series.rawValue) ?? parseIndentedObject(frontmatter.split('\n'), series.index) : new Map()
  const seriesOrder = seriesFields.get('order')

  if (series && isBlankValue(seriesFields.get('title'))) {
    report(context, file, 'missing required frontmatter: series.title')
  }

  if (seriesOrder && parsePositiveInteger(seriesOrder) === undefined) {
    report(context, file, 'series.order must be a positive integer')
  }
}

function checkReadingFrontmatter(context, file, frontmatter, body, knownRoutes) {
  const fields = parseFrontmatter(frontmatter)
  const requiredKeys = ['title', 'type', 'note']

  for (const key of requiredKeys) {
    if (isBlankValue(fields.get(key))) {
      report(context, file, `missing required frontmatter: ${key}`)
    }
  }

  const type = fields.get('type')

  if (!isBlankValue(type) && !readingTypeSet.has(type)) {
    report(context, file, `type must be one of: ${readingTypeValues.join(', ')}`)
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
  }

  if (image?.startsWith('/')) {
    checkRootRelativeTarget(context, file, image, knownRoutes)
  }

  const url = fields.get('url')

  if (!url && !hasBodyContent(body)) {
    report(context, file, 'reading resources require url or body content')
  }

  if (!url) {
    return
  }

  checkHttpOrRootRelativeTarget(context, file, 'url', url, knownRoutes)
}

function checkProjectFrontmatter(context, file, frontmatter, body, knownRoutes) {
  const fields = parseFrontmatter(frontmatter)
  const requiredKeys = ['name', 'description', 'order']

  for (const key of requiredKeys) {
    if (isBlankValue(fields.get(key))) {
      report(context, file, `missing required frontmatter: ${key}`)
    }
  }

  const order = fields.get('order')

  if (order && parseNonnegativeInteger(order) === undefined) {
    report(context, file, 'order must be a nonnegative integer')
  }

  const status = fields.get('status')

  if (status && !projectStatusSet.has(status)) {
    report(context, file, `status must be one of: ${projectStatusValues.join(', ')}`)
  }

  const group = getTopLevelField(frontmatter, 'group')
  const groupFields = group ? parseInlineObject(group.rawValue) ?? parseIndentedObject(frontmatter.split('\n'), group.index) : new Map()

  for (const key of ['title', 'description', 'order']) {
    if (isBlankValue(groupFields.get(key))) {
      report(context, file, `missing required frontmatter: group.${key}`)
    }
  }

  const groupOrder = groupFields.get('order')

  if (groupOrder && parseNonnegativeInteger(groupOrder) === undefined) {
    report(context, file, 'group.order must be a nonnegative integer')
  }

  const tags = parseListValue(frontmatter, 'tags')
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

  const detail = fields.get('detail') === 'true'
  const link = fields.get('link')

  if (link) {
    checkHttpOrRootRelativeTarget(context, file, 'link', link, knownRoutes)
  }

  const projectLinks = parseBlockObjectList(frontmatter, 'links')

  for (const projectLink of projectLinks) {
    if (isBlankValue(projectLink.get('label'))) {
      report(context, file, 'missing required frontmatter: links.label')
    }

    const href = projectLink.get('href')

    if (isBlankValue(href)) {
      report(context, file, 'missing required frontmatter: links.href')
      continue
    }

    checkHttpOrRootRelativeTarget(context, file, 'links.href', href, knownRoutes)
  }

  if (!detail) {
    return
  }

  for (const key of ['summary', 'retrospective']) {
    if (isBlankValue(fields.get(key))) {
      report(context, file, `missing required frontmatter: ${key}`)
    }
  }

  if (parseListValue(frontmatter, 'designNotes').length === 0) {
    report(context, file, 'missing required frontmatter: designNotes')
  }

  if (projectLinks.length === 0) {
    report(context, file, 'missing required frontmatter: links')
  }

  if (body.trim() === '') {
    report(context, file, 'detail projects require body content')
  }

  checkRootRelativeTargets(context, file, frontmatter, knownRoutes)
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
  const projectFiles = getProjectFiles(context)
  const knownRoutes = getKnownRoutes(context, blogFiles, readingFiles, projectFiles)

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

    checkReadingFrontmatter(context, file, parts.frontmatter, parts.body, knownRoutes)
    checkRootRelativeTargets(context, file, parts.body, knownRoutes)
  }

  for (const file of projectFiles) {
    const source = readFileSync(file, 'utf8')
    const parts = splitFrontmatter(context, file, source)

    if (!parts) {
      continue
    }

    checkProjectFrontmatter(context, file, parts.frontmatter, parts.body, knownRoutes)
    checkRootRelativeTargets(context, file, parts.body, knownRoutes)
  }

  return {
    blogCount: blogFiles.length,
    readingCount: readingFiles.length,
    projectCount: projectFiles.length,
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
  console.log(`[content] ok: ${result.projectCount} project(s) checked`)

  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runContentCheck())
}
