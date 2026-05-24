import assert from 'node:assert/strict'
import test from 'node:test'
import {
  checkDeploymentHealthPath,
  createDeploymentHealthUrl,
  deploymentHealthPaths,
  runDeploymentHealthCheck,
  validateDeploymentHealthOrigin,
} from '../scripts/check-deployment-health.mjs'

const silentLogger = {
  info() {},
  error() {},
}

function createResponse({ ok = true, status = 200, body = 'ok' } = {}) {
  return {
    ok,
    status,
    text: async () => body,
  }
}

test('uses the required deployment health paths', () => {
  assert.deepEqual(deploymentHealthPaths, ['/', '/rss.xml', '/sitemap.xml'])
})

test('fails deployment health origin validation when PUBLIC_SITE_ORIGIN is missing', () => {
  assert.deepEqual(validateDeploymentHealthOrigin({}), {
    ok: false,
    message: 'PUBLIC_SITE_ORIGIN is required for deployment health checks.',
  })
})

test('fails deployment health origin validation when PUBLIC_SITE_ORIGIN is blank', () => {
  assert.deepEqual(validateDeploymentHealthOrigin({ PUBLIC_SITE_ORIGIN: '   ' }), {
    ok: false,
    message: 'PUBLIC_SITE_ORIGIN is required for deployment health checks.',
  })
})

test('fails deployment health origin validation for unsupported protocols', () => {
  assert.deepEqual(validateDeploymentHealthOrigin({ PUBLIC_SITE_ORIGIN: 'ftp://example.com' }), {
    ok: false,
    message: 'PUBLIC_SITE_ORIGIN must use http or https.',
  })
})

test('fails deployment health origin validation when credentials are present', () => {
  assert.deepEqual(validateDeploymentHealthOrigin({ PUBLIC_SITE_ORIGIN: 'https://user:pass@example.com' }), {
    ok: false,
    message: 'PUBLIC_SITE_ORIGIN must not include credentials.',
  })
})

test('passes deployment health origin validation when PUBLIC_SITE_ORIGIN is configured', () => {
  assert.deepEqual(validateDeploymentHealthOrigin({ PUBLIC_SITE_ORIGIN: ' https://example.com/ ' }), {
    ok: true,
    origin: 'https://example.com',
  })
})

test('builds health check URLs from normalized paths', () => {
  assert.equal(createDeploymentHealthUrl('https://example.com', 'rss.xml'), 'https://example.com/rss.xml')
})

test('passes deployment health path check for non-empty 2xx responses', async () => {
  const requestedUrls = []
  const result = await checkDeploymentHealthPath({
    origin: 'https://example.com',
    path: '/rss.xml',
    fetchImplementation: async (url) => {
      requestedUrls.push(url)
      return createResponse()
    },
  })

  assert.deepEqual(requestedUrls, ['https://example.com/rss.xml'])
  assert.deepEqual(result, {
    ok: true,
    path: '/rss.xml',
    status: 200,
  })
})

test('fails deployment health path check for non-2xx responses', async () => {
  const result = await checkDeploymentHealthPath({
    origin: 'https://example.com',
    path: '/sitemap.xml',
    fetchImplementation: async () => createResponse({ ok: false, status: 404 }),
  })

  assert.deepEqual(result, {
    ok: false,
    path: '/sitemap.xml',
    status: 404,
    message: 'Unexpected HTTP 404 for /sitemap.xml.',
  })
})

test('fails deployment health path check for empty responses', async () => {
  const result = await checkDeploymentHealthPath({
    origin: 'https://example.com',
    path: '/',
    fetchImplementation: async () => createResponse({ body: '   ' }),
  })

  assert.deepEqual(result, {
    ok: false,
    path: '/',
    status: 200,
    message: 'Empty response body for /.',
  })
})

test('deployment health check returns failing exit code without PUBLIC_SITE_ORIGIN', async () => {
  assert.equal(await runDeploymentHealthCheck({}, { logger: silentLogger }), 1)
})

test('deployment health check returns failing exit code when a key path is unhealthy', async () => {
  const exitCode = await runDeploymentHealthCheck(
    { PUBLIC_SITE_ORIGIN: 'https://example.com' },
    {
      logger: silentLogger,
      fetchImplementation: async (url) =>
        createResponse({
          ok: !url.endsWith('/rss.xml'),
          status: url.endsWith('/rss.xml') ? 500 : 200,
        }),
    },
  )

  assert.equal(exitCode, 1)
})

test('deployment health check returns passing exit code when every key path is healthy', async () => {
  const requestedUrls = []
  const exitCode = await runDeploymentHealthCheck(
    { PUBLIC_SITE_ORIGIN: 'https://example.com/' },
    {
      logger: silentLogger,
      fetchImplementation: async (url) => {
        requestedUrls.push(url)
        return createResponse()
      },
    },
  )

  assert.equal(exitCode, 0)
  assert.deepEqual(requestedUrls, ['https://example.com/', 'https://example.com/rss.xml', 'https://example.com/sitemap.xml'])
})
