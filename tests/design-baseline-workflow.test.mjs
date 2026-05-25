import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflow = readFileSync(new URL('../.github/workflows/design-baseline.yml', import.meta.url), 'utf8')

test('design baseline workflow is manual and uploads screenshots', () => {
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /npm ci/)
  assert.match(workflow, /browser-actions\/setup-chrome@v1/)
  assert.match(workflow, /npm run design:baseline/)
  assert.match(workflow, /actions\/upload-artifact@v4/)
  assert.match(workflow, /name: design-baseline-screenshots/)
  assert.match(workflow, /path: docs\/design-baseline\/screenshots\/\*\.png/)
})

test('design baseline workflow does not deploy or require private content', () => {
  assert.doesNotMatch(workflow, /pull_request:/)
  assert.doesNotMatch(workflow, /push:/)
  assert.doesNotMatch(workflow, /PRIVATE_CONTENT/)
  assert.doesNotMatch(workflow, /DEPLOY_/)
  assert.doesNotMatch(workflow, /docker compose/)
  assert.doesNotMatch(workflow, /rsync/)
})
