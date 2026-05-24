import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { runSyncContent } from '../scripts/sync-content.mjs'

function createFixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), 'blog-sync-test-'))

  t.after(() => {
    rmSync(root, { recursive: true, force: true })
  })

  return root
}

function createLogger() {
  const messages = []

  return {
    logger: {
      info(message) {
        messages.push(`info:${message}`)
      },
      error(message) {
        messages.push(`error:${message}`)
      },
    },
    messages,
  }
}

function writeFixtureFile(root, path, content = `${path}\n`) {
  const file = join(root, path)

  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}

function readFixtureFile(root, path) {
  return readFileSync(join(root, path), 'utf8')
}

function listPayloadEntries(root, path) {
  return readdirSync(join(root, path)).filter((entry) => entry !== '.gitkeep').sort()
}

function seedRequiredSampleContent(root) {
  writeFixtureFile(root, 'sample-content/blog/sample-post.mdx', 'sample blog\n')
  writeFixtureFile(root, 'sample-content/reading/sample-reading.mdx', 'sample reading\n')
  writeFixtureFile(root, 'sample-content/projects/sample-project.mdx', 'sample project\n')
}

function seedRequiredPrivateContent(root) {
  writeFixtureFile(root, 'private-content/blog/private-post.mdx', 'private blog\n')
  writeFixtureFile(root, 'private-content/reading/private-reading.mdx', 'private reading\n')
  writeFixtureFile(root, 'private-content/projects/private-project.mdx', 'private project\n')
}

test('copies sample content in non-strict mode without touching the real repository', (t) => {
  const root = createFixtureRoot(t)
  const { logger } = createLogger()

  /*
   * ================================================================================
   * 步骤1：准备 sample 回退内容
   * ================================================================================
   * 目标：
   * 1) 在临时仓库根目录创建 sample-content
   * 2) 预置旧目标文件，验证同步前会清理目标目录
   */
  logger.info('开始准备 sample 回退内容...')

  // 1.1 写入必填 sample 内容
  seedRequiredSampleContent(root)

  // 1.2 写入可选 sample 资源和旧目标文件
  writeFixtureFile(root, 'sample-content/assets/files/sample.txt', 'sample file\n')
  writeFixtureFile(root, 'src/content/blog/stale.mdx', 'stale blog\n')
  logger.info('sample 回退内容准备完成')

  /*
   * ================================================================================
   * 步骤2：执行非 strict 同步
   * ================================================================================
   * 目标：
   * 1) 不提供 private-content
   * 2) 验证脚本回退复制 sample 内容
   */
  logger.info('开始执行非 strict 同步...')

  // 2.1 同步临时仓库内容
  const exitCode = runSyncContent({ root, env: {}, args: [], logger })

  // 2.2 校验 sample 内容和旧目标清理结果
  assert.equal(exitCode, 0)
  assert.equal(readFixtureFile(root, 'src/content/blog/sample-post.mdx'), 'sample blog\n')
  assert.equal(readFixtureFile(root, 'src/content/reading/sample-reading.mdx'), 'sample reading\n')
  assert.equal(readFixtureFile(root, 'src/content/projects/sample-project.mdx'), 'sample project\n')
  assert.equal(readFixtureFile(root, 'public/files/sample.txt'), 'sample file\n')
  assert.equal(existsSync(join(root, 'src/content/blog/stale.mdx')), false)
  logger.info('非 strict 同步执行完成')
})

test('returns a failing exit code when strict mode is missing required private content', (t) => {
  const root = createFixtureRoot(t)
  const { logger, messages } = createLogger()

  /*
   * ================================================================================
   * 步骤1：准备 strict 缺失内容
   * ================================================================================
   * 目标：
   * 1) 只创建 sample-content，不创建 private-content
   * 2) 预置目标文件，验证失败时目标仍被清理
   */
  logger.info('开始准备 strict 缺失内容...')

  // 1.1 写入 sample 内容，strict 模式不会使用它
  seedRequiredSampleContent(root)

  // 1.2 写入旧目标文件
  writeFixtureFile(root, 'src/content/blog/stale.mdx', 'stale blog\n')
  logger.info('strict 缺失内容准备完成')

  /*
   * ================================================================================
   * 步骤2：执行 strict 同步
   * ================================================================================
   * 目标：
   * 1) strict 模式缺少必填 private 内容时返回失败码
   * 2) 错误信息列出缺失的必填内容类型
   */
  logger.info('开始执行 strict 同步...')

  // 2.1 同步临时仓库内容
  const exitCode = runSyncContent({ root, env: {}, args: ['--strict'], logger })

  // 2.2 校验失败码、错误信息和目标清理结果
  assert.equal(exitCode, 1)
  assert(messages.some((message) => message.includes('Strict mode requires non-empty private blog posts')))
  assert(messages.some((message) => message.includes('Strict mode requires non-empty private reading resources')))
  assert(messages.some((message) => message.includes('Strict mode requires non-empty private projects')))
  assert.deepEqual(listPayloadEntries(root, 'src/content/blog'), [])
  logger.info('strict 同步执行完成')
})

test('uses private content instead of sample content when both sources exist', (t) => {
  const root = createFixtureRoot(t)
  const { logger } = createLogger()

  /*
   * ================================================================================
   * 步骤1：准备 private 与 sample 双来源
   * ================================================================================
   * 目标：
   * 1) sample 和 private 同时提供 blog 内容
   * 2) private 只需覆盖对应目标，不与 sample 合并
   */
  logger.info('开始准备 private 与 sample 双来源...')

  // 1.1 写入 sample 内容
  seedRequiredSampleContent(root)
  writeFixtureFile(root, 'sample-content/blog/sample-only.mdx', 'sample only\n')

  // 1.2 写入 private 内容
  writeFixtureFile(root, 'private-content/blog/private-only.mdx', 'private only\n')
  logger.info('private 与 sample 双来源准备完成')

  /*
   * ================================================================================
   * 步骤2：执行混合来源同步
   * ================================================================================
   * 目标：
   * 1) blog 使用 private 内容
   * 2) reading 和 projects 缺少 private 内容时回退 sample
   */
  logger.info('开始执行混合来源同步...')

  // 2.1 同步临时仓库内容
  const exitCode = runSyncContent({ root, env: {}, args: [], logger })

  // 2.2 校验 private 优先且不合并 sample blog
  assert.equal(exitCode, 0)
  assert.deepEqual(listPayloadEntries(root, 'src/content/blog'), ['private-only.mdx'])
  assert.equal(readFixtureFile(root, 'src/content/blog/private-only.mdx'), 'private only\n')
  assert.equal(readFixtureFile(root, 'src/content/reading/sample-reading.mdx'), 'sample reading\n')
  assert.equal(readFixtureFile(root, 'src/content/projects/sample-project.mdx'), 'sample project\n')
  logger.info('混合来源同步执行完成')
})

test('cleans optional asset targets in strict mode when private assets are absent', (t) => {
  const root = createFixtureRoot(t)
  const { logger } = createLogger()

  /*
   * ================================================================================
   * 步骤1：准备 strict 必填内容和旧资源
   * ================================================================================
   * 目标：
   * 1) private-content 提供 strict 模式必填的三类内容
   * 2) 不提供 private assets，验证可选资源目标会被清理
   */
  logger.info('开始准备 strict 必填内容和旧资源...')

  // 1.1 写入必填 private 内容
  seedRequiredPrivateContent(root)

  // 1.2 写入旧资源目标文件
  writeFixtureFile(root, 'public/images/blog/stale.svg', '<svg />\n')
  writeFixtureFile(root, 'public/images/reading/stale.svg', '<svg />\n')
  writeFixtureFile(root, 'public/images/projects/stale.svg', '<svg />\n')
  writeFixtureFile(root, 'public/files/stale.txt', 'stale file\n')
  logger.info('strict 必填内容和旧资源准备完成')

  /*
   * ================================================================================
   * 步骤2：执行 strict 同步
   * ================================================================================
   * 目标：
   * 1) 必填 private 内容存在时 strict 同步成功
   * 2) 缺失的可选资源目标只保留 .gitkeep
   */
  logger.info('开始执行 strict 同步...')

  // 2.1 同步临时仓库内容
  const exitCode = runSyncContent({ root, env: {}, args: ['--strict'], logger })

  // 2.2 校验必填内容已复制，可选资源已清理
  assert.equal(exitCode, 0)
  assert.equal(readFixtureFile(root, 'src/content/blog/private-post.mdx'), 'private blog\n')
  assert.deepEqual(listPayloadEntries(root, 'public/images/blog'), [])
  assert.deepEqual(listPayloadEntries(root, 'public/images/reading'), [])
  assert.deepEqual(listPayloadEntries(root, 'public/images/projects'), [])
  assert.deepEqual(listPayloadEntries(root, 'public/files'), [])
  logger.info('strict 同步执行完成')
})

test('rejects private content roots that overlap sync targets', (t) => {
  const root = createFixtureRoot(t)
  const { logger, messages } = createLogger()

  /*
   * ================================================================================
   * 步骤1：准备重叠来源配置
   * ================================================================================
   * 目标：
   * 1) 将 PRIVATE_CONTENT_ROOT 指向同步目标目录
   * 2) 验证脚本拒绝可能清空目标的危险配置
   */
  logger.info('开始准备重叠来源配置...')

  // 1.1 写入目标目录，模拟错误配置指向生成目标
  writeFixtureFile(root, 'src/content/blog/existing.mdx', 'existing\n')
  logger.info('重叠来源配置准备完成')

  /*
   * ================================================================================
   * 步骤2：执行重叠来源同步
   * ================================================================================
   * 目标：
   * 1) 返回失败码
   * 2) 在清理目标前中止
   */
  logger.info('开始执行重叠来源同步...')

  // 2.1 使用重叠的 private root 运行同步
  const exitCode = runSyncContent({
    root,
    env: { PRIVATE_CONTENT_ROOT: 'src/content/blog' },
    args: [],
    logger,
  })

  // 2.2 校验失败码和目标目录未被清空
  assert.equal(exitCode, 1)
  assert(messages.some((message) => message.includes('PRIVATE_CONTENT_ROOT overlaps blog posts target')))
  assert.equal(readFixtureFile(root, 'src/content/blog/existing.mdx'), 'existing\n')
  logger.info('重叠来源同步执行完成')
})
