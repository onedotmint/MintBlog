import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

export async function importTsModule(moduleUrl) {
  const sourcePath = moduleUrl.pathname
  const source = readFileSync(sourcePath, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  })
  const tempDir = mkdtempSync(join(tmpdir(), 'blog-ts-test-'))
  const outputPath = join(tempDir, `${basename(sourcePath, '.ts')}.mjs`)

  writeFileSync(outputPath, output.outputText)

  return import(pathToFileURL(outputPath))
}
