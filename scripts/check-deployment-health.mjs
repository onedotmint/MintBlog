import { fileURLToPath } from 'node:url'

export const deploymentHealthPaths = ['/', '/rss.xml', '/sitemap.xml']

const logger = {
  info(message) {
    console.log(`[deployment-health] ${message}`)
  },
  error(message) {
    console.error(`[deployment-health] ${message}`)
  },
}

function normalizeEnvironmentValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeHealthPath(path) {
  return path.startsWith('/') ? path : `/${path}`
}

export function validateDeploymentHealthOrigin(env = process.env) {
  const origin = normalizeEnvironmentValue(env.PUBLIC_SITE_ORIGIN)

  if (!origin) {
    return {
      ok: false,
      message: 'PUBLIC_SITE_ORIGIN is required for deployment health checks.',
    }
  }

  let url

  try {
    url = new URL(origin)
  } catch {
    return {
      ok: false,
      message: 'PUBLIC_SITE_ORIGIN must be a valid absolute URL.',
    }
  }

  if (url.username || url.password) {
    return {
      ok: false,
      message: 'PUBLIC_SITE_ORIGIN must not include credentials.',
    }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      ok: false,
      message: 'PUBLIC_SITE_ORIGIN must use http or https.',
    }
  }

  return {
    ok: true,
    origin: url.origin,
  }
}

export function createDeploymentHealthUrl(origin, path) {
  return new URL(normalizeHealthPath(path), origin).toString()
}

async function readResponseBody(response) {
  if (typeof response.text !== 'function') {
    return ''
  }

  return response.text()
}

export async function checkDeploymentHealthPath({ origin, path, fetchImplementation = globalThis.fetch }) {
  const healthPath = normalizeHealthPath(path)
  const url = createDeploymentHealthUrl(origin, healthPath)

  if (typeof fetchImplementation !== 'function') {
    return {
      ok: false,
      path: healthPath,
      message: `Fetch API is unavailable for ${healthPath}.`,
    }
  }

  let response

  try {
    response = await fetchImplementation(url)
  } catch (error) {
    return {
      ok: false,
      path: healthPath,
      message: `Request failed for ${healthPath}: ${error?.name || 'Error'}`,
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      path: healthPath,
      status: response.status,
      message: `Unexpected HTTP ${response.status} for ${healthPath}.`,
    }
  }

  const body = await readResponseBody(response)

  if (!body.trim()) {
    return {
      ok: false,
      path: healthPath,
      status: response.status,
      message: `Empty response body for ${healthPath}.`,
    }
  }

  return {
    ok: true,
    path: healthPath,
    status: response.status,
  }
}

export async function runDeploymentHealthCheck(env = process.env, options = {}) {
  const log = options.logger ?? logger
  const paths = options.paths ?? deploymentHealthPaths
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch

  /*
   * ================================================================================
   * 步骤1：校验健康检查配置
   * ================================================================================
   * 目标：
   * 1) 从 PUBLIC_SITE_ORIGIN 读取生产公开访问地址
   * 2) 拒绝空值、无效 URL 和带凭据的 URL
   */
  log.info('开始校验部署健康检查配置...')

  // 1.1 读取并校验 PUBLIC_SITE_ORIGIN
  const originResult = validateDeploymentHealthOrigin(env)

  // 1.2 配置无效时输出安全错误，不打印任何部署密钥
  if (!originResult.ok) {
    log.error(originResult.message)
    log.info('部署健康检查配置校验完成, 结果: failed')
    return 1
  }

  log.info(`部署健康检查配置校验完成, origin: ${originResult.origin}`)

  /*
   * ================================================================================
   * 步骤2：探测公开静态入口
   * ================================================================================
   * 目标：
   * 1) 检查首页、RSS 和 sitemap 是否能通过公网访问
   * 2) 非 2xx 响应或空响应体都让部署失败
   */
  log.info(`开始探测部署健康状态, paths: ${paths.map(normalizeHealthPath).join(', ')}`)

  for (const path of paths) {
    // 2.1 逐个探测关键静态路径
    const result = await checkDeploymentHealthPath({
      origin: originResult.origin,
      path,
      fetchImplementation,
    })

    // 2.2 任一入口失败时立即返回失败码
    if (!result.ok) {
      log.error(result.message)
      log.info('部署健康状态探测完成, 结果: failed')
      return 1
    }

    log.info(`ok: ${result.path} (${result.status})`)
  }

  log.info(`部署健康状态探测完成, checked: ${paths.length}`)
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await runDeploymentHealthCheck()
}
