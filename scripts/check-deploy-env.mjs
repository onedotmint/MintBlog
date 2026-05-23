import { fileURLToPath } from 'node:url'

export const requiredDeployEnvironmentKeys = [
  'PRIVATE_CONTENT_REPOSITORY',
  'PRIVATE_CONTENT_TOKEN',
  'PUBLIC_SITE_ORIGIN',
  'DEPLOY_HOST',
  'DEPLOY_USER',
  'DEPLOY_PATH',
  'DEPLOY_KEY',
]

const logger = {
  info(message) {
    console.log(`[deploy-env] ${message}`)
  },
  error(message) {
    console.error(`[deploy-env] ${message}`)
  },
}

function normalizeEnvironmentValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateDeployEnvironment(env = process.env, requiredKeys = requiredDeployEnvironmentKeys) {
  const missing = requiredKeys.filter((key) => !normalizeEnvironmentValue(env[key]))

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      message: `Missing required deployment value${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`,
    }
  }

  return {
    ok: true,
    checked: [...requiredKeys],
  }
}

export function runDeployEnvironmentCheck(env = process.env, log = logger) {
  /*
   * ================================================================================
   * 步骤1：校验部署配置
   * ================================================================================
   * 目标：
   * 1) 在构建、SSH 和 rsync 前检查 GitHub Actions 必填配置
   * 2) 只输出配置项名称，不输出 secret 原文
   */
  log.info('Start deployment configuration check...')

  // 1.1 检查必填环境变量是否存在且非空
  const result = validateDeployEnvironment(env)

  // 1.2 缺失配置时返回失败码，并列出缺失名称
  if (!result.ok) {
    log.error(result.message)
    return 1
  }

  log.info(`Deployment configuration check complete, checked: ${result.checked.length}`)
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runDeployEnvironmentCheck())
}
