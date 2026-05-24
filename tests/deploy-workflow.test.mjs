import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
const productionCompose = readFileSync(new URL('../compose.prod.yaml', import.meta.url), 'utf8')

test('deploy workflow publishes a production image before restarting Compose', () => {
  const buildStepIndex = workflow.indexOf('Build and push production image')
  const uploadStepIndex = workflow.indexOf('Upload production Compose file')
  const deployStepIndex = workflow.indexOf('Deploy production container')

  assert.notEqual(buildStepIndex, -1)
  assert.notEqual(uploadStepIndex, -1)
  assert.notEqual(deployStepIndex, -1)
  assert(buildStepIndex < uploadStepIndex)
  assert(uploadStepIndex < deployStepIndex)
  assert.match(workflow, /docker\/build-push-action@v6/)
  assert.match(workflow, /ghcr\.io\/\$\{\{ github\.repository_owner \}\}\/mintblog/)
  assert.match(workflow, /push: true/)
  assert.match(workflow, /PRIVATE_CONTENT_STRICT=1/)
  assert.match(workflow, /org\.opencontainers\.image\.source=https:\/\/github\.com\/\$\{\{ github\.repository \}\}/)
})

test('deploy workflow uses Compose pull and does not upload dist with rsync', () => {
  assert.match(workflow, /docker compose pull/)
  assert.match(workflow, /docker compose up -d/)
  assert.doesNotMatch(workflow, /rsync/)
})

test('production Compose file runs a published image instead of building on the server', () => {
  assert.match(productionCompose, /image: \$\{BLOG_IMAGE:\?Set BLOG_IMAGE/)
  assert.match(productionCompose, /healthcheck:/)
  assert.doesNotMatch(productionCompose, /build:/)
})
