import assert from 'node:assert/strict'
import test from 'node:test'
import {
  requiredDeployEnvironmentKeys,
  runDeployEnvironmentCheck,
  validateDeployEnvironment,
} from '../scripts/check-deploy-env.mjs'

const silentLogger = {
  info() {},
  error() {},
}

function createValidDeployEnv(overrides = {}) {
  return {
    PRIVATE_CONTENT_REPOSITORY: 'owner/private-content',
    PRIVATE_CONTENT_TOKEN: 'token',
    PUBLIC_SITE_ORIGIN: 'https://example.com',
    DEPLOY_HOST: 'example.com',
    DEPLOY_USER: 'deploy',
    DEPLOY_PATH: '/var/www/blog',
    DEPLOY_KEY: '-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n-----END OPENSSH PRIVATE KEY-----',
    ...overrides,
  }
}

test('reports every missing deployment environment value by name', () => {
  const result = validateDeployEnvironment({})

  assert.equal(result.ok, false)
  assert.deepEqual(result.missing, requiredDeployEnvironmentKeys)

  for (const key of requiredDeployEnvironmentKeys) {
    assert.match(result.message, new RegExp(key))
  }
})

test('treats blank deployment environment values as missing', () => {
  const result = validateDeployEnvironment(
    createValidDeployEnv({
      DEPLOY_PATH: '   ',
    }),
  )

  assert.deepEqual(result, {
    ok: false,
    missing: ['DEPLOY_PATH'],
    message: 'Missing required deployment value: DEPLOY_PATH',
  })
})

test('passes when all deployment environment values are configured', () => {
  const result = validateDeployEnvironment(
    createValidDeployEnv({
      DEPLOY_HOST: ' example.com ',
    }),
  )

  assert.deepEqual(result, {
    ok: true,
    checked: requiredDeployEnvironmentKeys,
  })
})

test('deployment environment check returns failing exit code for missing values', () => {
  assert.equal(runDeployEnvironmentCheck({}, silentLogger), 1)
})

test('deployment environment check returns passing exit code for configured values', () => {
  assert.equal(runDeployEnvironmentCheck(createValidDeployEnv(), silentLogger), 0)
})
