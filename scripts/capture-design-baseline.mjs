import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const logger = {
  info(message, ...values) {
    console.log(`[design-baseline] ${formatMessage(message, values)}`)
  },
  error(message, ...values) {
    console.error(`[design-baseline] ${formatMessage(message, values)}`)
  },
}

/*
 * ================================================================================
 * 步骤1：准备截图配置
 * ================================================================================
 * 目标：
 * 1) 固定基线页面和视口，避免每次截图范围漂移
 * 2) 定位 dist、docs 输出目录和本机浏览器
 */
logger.info('开始准备截图配置...')

// 1.1 定位仓库根目录和截图输出目录
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distPath = join(root, 'dist')
const screenshotPath = join(root, 'docs', 'design-baseline', 'screenshots')

// 1.2 固定需要纳入设计基线的页面
const pages = [
  { name: 'home', path: '/' },
  { name: 'blog-index', path: '/blog/' },
  { name: 'article-detail', path: '/blog/cs61a-week-1/' },
  { name: 'article-series-index', path: '/blog/series/' },
  { name: 'article-series-detail', path: '/blog/series/cs61a-notes/' },
  { name: 'projects-index', path: '/projects/' },
  { name: 'project-detail', path: '/projects/build-pipeline-sketches/' },
  { name: 'about', path: '/about/' },
]

// 1.3 固定桌面和窄屏视口
const viewports = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'mobile', width: 390, height: 900 },
]

logger.info('截图配置完成, 页面: {}, 视口: {}', pages.length, viewports.length)

/*
 * ================================================================================
 * 步骤2：校验运行环境
 * ================================================================================
 * 目标：
 * 1) 确认 dist 已由 Astro 构建生成
 * 2) 找到可执行的 Chrome 或 Chromium
 */
logger.info('开始校验运行环境...')

// 2.1 确认 dist 存在
if (!existsSync(distPath)) {
  logger.error('dist/ 不存在, 请先运行 npm run build')
  process.exit(1)
}

// 2.2 确认 Chromium/Chrome 可用
const browserPath = findBrowserPath()

if (!browserPath) {
  logger.error('未找到 Chrome/Chromium, 可通过 CHROME_PATH 指定浏览器路径')
  process.exit(1)
}

// 2.3 确保截图目录存在
mkdirSync(screenshotPath, { recursive: true })

logger.info('运行环境校验完成, 浏览器: {}', browserPath)

/*
 * ================================================================================
 * 步骤3：启动静态文件服务
 * ================================================================================
 * 目标：
 * 1) 从 dist/ 提供本地 HTTP 页面
 * 2) 使用随机端口，避免和开发服务冲突
 */
logger.info('开始启动静态文件服务...')

// 3.1 创建只服务 dist 的静态服务器
const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url ?? '/')

  if (!filePath) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': getContentType(filePath),
  })
  createReadStream(filePath).pipe(response)
})

// 3.2 监听本地随机端口
try {
  await listen(server)
} catch (error) {
  logger.error('静态文件服务启动失败: {}', error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const address = server.address()
const origin = `http://127.0.0.1:${address.port}`

logger.info('静态文件服务启动完成, 地址: {}', origin)

/*
 * ================================================================================
 * 步骤4：捕获基线截图
 * ================================================================================
 * 目标：
 * 1) 按页面和视口组合生成 PNG
 * 2) 覆盖旧截图，保持基线目录可重复刷新
 */
logger.info('开始捕获基线截图...')

try {
  // 4.1 遍历每个页面
  for (const page of pages) {
    // 4.2 遍历每个视口
    for (const viewport of viewports) {
      const outputPath = join(screenshotPath, `${page.name}-${viewport.name}.png`)
      const url = `${origin}${page.path}`

      logger.info('开始截图: {} {}', page.name, viewport.name)
      await captureScreenshot(browserPath, url, outputPath, viewport)
      logger.info('截图完成: {}', relative(root, outputPath))
    }
  }

  logger.info('基线截图捕获完成, 文件数: {}', pages.length * viewports.length)
} catch (error) {
  logger.error('基线截图捕获失败: {}', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  /*
   * ================================================================================
   * 步骤5：关闭本地服务
   * ================================================================================
   * 目标：
   * 1) 释放随机端口
   * 2) 保证脚本失败时也能正常退出
   */
  logger.info('开始关闭静态文件服务...')

  // 5.1 关闭本地 HTTP 服务
  await new Promise((resolveClose) => {
    server.close(resolveClose)
  })

  logger.info('静态文件服务关闭完成')
}

function formatMessage(message, values) {
  let index = 0

  return message.replace(/\{\}/g, () => String(values[index++] ?? ''))
}

function findBrowserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    findExecutableOnPath('chromium'),
    findExecutableOnPath('chromium-browser'),
    findExecutableOnPath('google-chrome'),
    findExecutableOnPath('google-chrome-stable'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean)

  return candidates.find((candidate) => existsSync(candidate))
}

function findExecutableOnPath(name) {
  const pathValue = process.env.PATH ?? ''
  const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : ['']

  for (const directory of pathValue.split(process.platform === 'win32' ? ';' : ':')) {
    for (const extension of extensions) {
      const candidate = join(directory, `${name}${extension}`)

      if (existsSync(candidate)) {
        return candidate
      }
    }
  }

  return undefined
}

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, 'http://127.0.0.1')
  const requestPath = decodeURIComponent(url.pathname).replace(/^\/+/, '')
  const candidate = join(distPath, requestPath)
  const relativePath = relative(distPath, candidate)

  if (relativePath.startsWith('..') || relativePath === '..' || isAbsolute(relativePath)) {
    return undefined
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate
  }

  const indexPath = join(candidate, 'index.html')

  if (existsSync(indexPath) && statSync(indexPath).isFile()) {
    return indexPath
  }

  return undefined
}

function getContentType(filePath) {
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
  }

  return contentTypes[extname(filePath)] ?? 'application/octet-stream'
}

function listen(serverToStart) {
  return new Promise((resolveListen, rejectListen) => {
    serverToStart.once('error', rejectListen)
    serverToStart.listen(0, '127.0.0.1', () => {
      serverToStart.off('error', rejectListen)
      resolveListen()
    })
  })
}

function captureScreenshot(browserPath, url, outputPath, viewport) {
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${viewport.width},${viewport.height}`,
    `--screenshot=${outputPath}`,
    url,
  ]

  return new Promise((resolveCapture, rejectCapture) => {
    const child = spawn(browserPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', rejectCapture)
    child.on('close', (code) => {
      if (code === 0) {
        resolveCapture()
        return
      }

      rejectCapture(new Error(stderr.trim() || `Chromium exited with code ${code}`))
    })
  })
}
