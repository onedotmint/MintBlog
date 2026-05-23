import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const moduleSpecifierPatternSource = String.raw`(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]`

function createModuleSpecifierPattern() {
  return new RegExp(moduleSpecifierPatternSource, 'g')
}

function getTranspiledPath(sourceRoot, outputRoot, sourcePath) {
  const relativePath = relative(sourceRoot, sourcePath)
  const extension = extname(relativePath)
  const outputRelativePath = extension === '.ts' ? relativePath.slice(0, -extension.length) + '.mjs' : relativePath

  return join(outputRoot, outputRelativePath)
}

function rewriteRelativeSpecifiers(source, sourcePath) {
  return source.replace(createModuleSpecifierPattern(), (statement, specifier) => {
    if (!specifier.startsWith('.')) {
      return statement
    }

    const extension = extname(specifier)
    const targetPath = resolve(dirname(sourcePath), specifier)
    const targetTsPath = extension ? targetPath : `${targetPath}.ts`

    if (!existsSync(targetTsPath)) {
      return statement
    }

    const rewrittenSpecifier = extension === '.ts' ? specifier.slice(0, -extension.length) + '.mjs' : `${specifier}.mjs`

    return statement.replace(specifier, rewrittenSpecifier)
  })
}

function collectLocalDependencies(sourcePath, seen = new Set()) {
  if (seen.has(sourcePath)) {
    return []
  }

  seen.add(sourcePath)

  const source = readFileSync(sourcePath, 'utf8')
  const dependencies = [sourcePath]
  const moduleSpecifierPattern = createModuleSpecifierPattern()
  let match

  while ((match = moduleSpecifierPattern.exec(source)) !== null) {
    const specifier = match[1]

    if (!specifier.startsWith('.')) {
      continue
    }

    const extension = extname(specifier)
    const targetPath = resolve(dirname(sourcePath), specifier)
    const targetTsPath = extension ? targetPath : `${targetPath}.ts`

    if (existsSync(targetTsPath)) {
      dependencies.push(...collectLocalDependencies(targetTsPath, seen))
    }
  }

  return dependencies
}

function getSourceRoot(sourcePaths) {
  return sourcePaths
    .map(dirname)
    .reduce((root, current) => {
      const rootParts = root.split('/')
      const currentParts = current.split('/')
      const shared = []

      for (let index = 0; index < Math.min(rootParts.length, currentParts.length); index += 1) {
        if (rootParts[index] !== currentParts[index]) {
          break
        }

        shared.push(rootParts[index])
      }

      return shared.join('/') || '/'
    })
}

function transpileModule(sourceRoot, outputRoot, sourcePath) {
  const source = rewriteRelativeSpecifiers(readFileSync(sourcePath, 'utf8'), sourcePath)
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  })
  const outputPath = getTranspiledPath(sourceRoot, outputRoot, sourcePath)

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, output.outputText)
}

export async function importTsModule(moduleUrl) {
  const sourcePath = moduleUrl.pathname
  const sourcePaths = collectLocalDependencies(sourcePath)
  const sourceRoot = getSourceRoot(sourcePaths)
  const tempDir = mkdtempSync(join(tmpdir(), 'blog-ts-test-'))

  for (const dependencyPath of sourcePaths) {
    transpileModule(sourceRoot, tempDir, dependencyPath)
  }

  const outputPath = getTranspiledPath(sourceRoot, tempDir, sourcePath)

  return import(pathToFileURL(outputPath))
}
