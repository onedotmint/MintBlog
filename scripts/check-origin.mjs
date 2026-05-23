import { fileURLToPath } from 'node:url'

function normalizeOriginValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateProductionOrigin(env = process.env) {
  const origin = normalizeOriginValue(env.PUBLIC_SITE_ORIGIN)

  if (!origin) {
    return {
      ok: false,
      message: 'PUBLIC_SITE_ORIGIN is required for production deployment builds.',
    }
  }

  return {
    ok: true,
    origin,
  }
}

export function runOriginCheck(env = process.env) {
  const result = validateProductionOrigin(env)

  if (!result.ok) {
    console.error(`[origin] ${result.message}`)
    return 1
  }

  console.log(`[origin] ok: ${result.origin}`)
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runOriginCheck())
}
