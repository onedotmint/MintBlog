import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { join, relative, sep } from 'node:path'
import { getPostDates, postFileHash } from '../src/utils/post-metadata.ts'

const root = process.cwd()
// Docker deliberately has no .git; it consumes the snapshot prepared outside its context.
if (existsSync(join(root, '.git'))) {
  const posts: Record<
    string,
    ReturnType<typeof getPostDates> & { hash: string }
  > = {}
  function collect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) collect(path)
      else if (
        entry.isFile() &&
        !entry.name.startsWith('_') &&
        /\.(md|mdx)$/.test(entry.name)
      ) {
        const key = relative(root, path).split(sep).join('/')
        posts[key] = { ...getPostDates(root, path), hash: postFileHash(path) }
      }
    }
  }
  for (const collection of ['blog', 'shorts', 'projects/posts'])
    collect(join(root, 'src/content', collection))
  const path = join(root, '.post-dates.json')
  const snapshot = JSON.stringify({ version: 1, posts }, null, 2) + '\n'
  if (!existsSync(path) || readFileSync(path, 'utf8') !== snapshot) {
    const temporary = `${path}.${process.pid}.tmp`
    writeFileSync(temporary, snapshot)
    renameSync(temporary, path)
  }
  console.log(
    `Post dates: exported ${Object.keys(posts).length} entries for builds without Git.`
  )
}
