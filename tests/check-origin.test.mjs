import assert from 'node:assert/strict'
import test from 'node:test'
import { runOriginCheck, validateProductionOrigin } from '../scripts/check-origin.mjs'

test('fails production origin validation when PUBLIC_SITE_ORIGIN is missing', () => {
  assert.deepEqual(validateProductionOrigin({}), {
    ok: false,
    message: 'PUBLIC_SITE_ORIGIN is required for production deployment builds.',
  })
})

test('fails production origin validation when PUBLIC_SITE_ORIGIN is blank', () => {
  assert.deepEqual(validateProductionOrigin({ PUBLIC_SITE_ORIGIN: '   ' }), {
    ok: false,
    message: 'PUBLIC_SITE_ORIGIN is required for production deployment builds.',
  })
})

test('passes production origin validation when PUBLIC_SITE_ORIGIN is configured', () => {
  assert.deepEqual(validateProductionOrigin({ PUBLIC_SITE_ORIGIN: ' https://example.com/ ' }), {
    ok: true,
    origin: 'https://example.com/',
  })
})

test('origin check returns a failing exit code for deploy builds without PUBLIC_SITE_ORIGIN', () => {
  assert.equal(runOriginCheck({}), 1)
})

test('origin check returns a passing exit code when PUBLIC_SITE_ORIGIN is configured', () => {
  assert.equal(runOriginCheck({ PUBLIC_SITE_ORIGIN: 'https://example.com' }), 0)
})
