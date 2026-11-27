import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, access, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const script = new URL('../scripts/build-search.mjs', import.meta.url)

test('Pagefind clears stale output and never indexes the whole site without article markers', async () => {
  const site = await mkdtemp(join(tmpdir(), 'mintblog-search-empty-'))
  try {
    await mkdir(join(site, 'pagefind'))
    await writeFile(join(site, 'pagefind/pagefind.js'), 'stale index')
    await writeFile(
      join(site, 'index.html'),
      '<html lang="en"><title>Home</title><body>Not an article</body></html>',
    )
    const result = spawnSync(process.execPath, [fileURLToPath(script), site], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /no eligible articles/)
    await assert.rejects(access(join(site, 'pagefind')))
  } finally {
    await rm(site, { recursive: true, force: true })
  }
})

test('Pagefind still emits an index when a real article body marker is present', async () => {
  const site = await mkdtemp(join(tmpdir(), 'mintblog-search-article-'))
  try {
    await writeFile(
      join(site, 'index.html'),
      '<html lang="en"><head><title>Article</title></head><body><article data-pagefind-body><h1>Article</h1><p>A searchable article body.</p></article></body></html>',
    )
    const result = spawnSync(process.execPath, [fileURLToPath(script), site], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    await access(join(site, 'pagefind/pagefind.js'))
  } finally {
    await rm(site, { recursive: true, force: true })
  }
})
