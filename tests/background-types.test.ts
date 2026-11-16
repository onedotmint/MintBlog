import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pageSchema, projectPostSchema } from '../src/schema.ts'
import { BG_TYPES, isBgType } from '../src/types.ts'
import { parsePostData } from './helpers/content-image.ts'
import type { BgType } from '../src/types.ts'
import { ogImageMarkup } from '../src/utils/og-image/template/markup.ts'

test('BG_TYPES preserves existing background names without duplicates', () => {
  const supported: readonly string[] = BG_TYPES
  for (const name of [
    'plum',
    'dot',
    'rose',
    'particle',
    'signal',
    'signal-plus',
    'breeze',
    'mist',
  ]) assert.ok(supported.includes(name), name)
  assert.equal(new Set(BG_TYPES).size, BG_TYPES.length)
})

test('pageSchema, postSchema, and projectPostSchema share BG_TYPES and false default', async () => {
  assert.equal(pageSchema.parse({}).bgType, false)
  assert.equal((await parsePostData({})).bgType, false)
  assert.equal((await parsePostData({}, projectPostSchema)).bgType, false)

  for (const value of [false, ...BG_TYPES]) {
    assert.equal(pageSchema.parse({ bgType: value }).bgType, value)
    assert.equal((await parsePostData({ bgType: value })).bgType, value)
    assert.equal(
      (await parsePostData({ bgType: value }, projectPostSchema)).bgType,
      value
    )
  }

  for (const invalid of ['unknown', '', true, 123, null]) {
    assert.equal(pageSchema.safeParse({ bgType: invalid }).success, false)
    await assert.rejects(parsePostData({ bgType: invalid }), /bgType/)
    await assert.rejects(parsePostData({ bgType: invalid }, projectPostSchema), /bgType/)
  }
})

test('ogImageMarkup accepts every BG_TYPES entry and rejects unknown types', () => {
  for (const bgType of BG_TYPES) {
    const node = ogImageMarkup('Mint', 'Title', bgType)
    assert.ok(node && typeof node === 'object')
  }

  assert.throws(
    () => ogImageMarkup('Mint', 'Title', 'unknown' as BgType),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(
        error.message,
        /The value of 'bgType' must be one of the following:/
      )
      for (const bgType of BG_TYPES) {
        assert.ok(error.message.includes(`'${bgType}'`))
      }
      return true
    }
  )
})

test('the shared background guard accepts every background and rejects other values', () => {
  for (const value of BG_TYPES) assert.equal(isBgType(value), true)
  for (const value of ['unknown', '', false, true, 123, null, undefined]) {
    assert.equal(isBgType(value), false)
  }
})
