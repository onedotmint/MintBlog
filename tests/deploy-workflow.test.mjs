import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
const productionCompose = readFileSync(new URL('../compose.prod.yaml', import.meta.url), 'utf8')
const dockerIgnore = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8')
const productionDockerfile = readFileSync(new URL('../Dockerfile.production', import.meta.url), 'utf8')

test('deploy workflow publishes a production image before restarting Compose', () => {
  const staticBuildStepIndex = workflow.indexOf('Build production static output')
  const imageContextStepIndex = workflow.indexOf('Prepare production image context')
  const buildStepIndex = workflow.indexOf('Build and push production image')
  const uploadStepIndex = workflow.indexOf('Upload production Compose file')
  const deployStepIndex = workflow.indexOf('Deploy production container')

  assert.notEqual(staticBuildStepIndex, -1)
  assert.notEqual(imageContextStepIndex, -1)
  assert.notEqual(buildStepIndex, -1)
  assert.notEqual(uploadStepIndex, -1)
  assert.notEqual(deployStepIndex, -1)
  assert(staticBuildStepIndex < imageContextStepIndex)
  assert(imageContextStepIndex < buildStepIndex)
  assert(buildStepIndex < uploadStepIndex)
  assert(uploadStepIndex < deployStepIndex)
  assert.match(workflow, /docker\/build-push-action@v6/)
  assert.match(workflow, /ghcr\.io\/\$\{\{ github\.repository_owner \}\}\/mintblog/)
  assert.match(workflow, /context: \$\{\{ runner\.temp \}\}\/blog-image-context/)
  assert.match(workflow, /push: true/)
  assert.match(workflow, /npm run build:deploy/)
  assert.match(workflow, /org\.opencontainers\.image\.source=https:\/\/github\.com\/\$\{\{ github\.repository \}\}/)
  assert.doesNotMatch(workflow, /cache-to: type=gha/)
  assert.doesNotMatch(workflow, /cache-from: type=gha/)
})

test('deploy workflow uses Compose pull and does not upload dist with rsync', () => {
  assert.match(workflow, /docker compose pull/)
  assert.match(workflow, /docker compose up -d/)
  assert.doesNotMatch(workflow, /rsync/)
})

test('deploy workflow pins SSH host identity from a secret', () => {
  const configStepIndex = workflow.indexOf('Check deployment configuration')
  const privateCheckoutIndex = workflow.indexOf('Checkout private content repository')
  const sshStepIndex = workflow.indexOf('Configure SSH')

  assert.notEqual(configStepIndex, -1)
  assert.notEqual(privateCheckoutIndex, -1)
  assert.notEqual(sshStepIndex, -1)
  assert(configStepIndex < privateCheckoutIndex)
  assert.match(workflow, /DEPLOY_KNOWN_HOSTS: \$\{\{ secrets\.DEPLOY_KNOWN_HOSTS \}\}/)
  assert.match(workflow, /printf '%s\\n' "\$DEPLOY_KNOWN_HOSTS" > ~\/\.ssh\/known_hosts/)
  assert.match(workflow, /StrictHostKeyChecking=yes/)
  assert.match(workflow, /UserKnownHostsFile="\$HOME\/\.ssh\/known_hosts"/)
  assert.doesNotMatch(workflow, /ssh-keyscan/)
})

test('production image build context only needs static output and Nginx config', () => {
  assert.match(workflow, /cp Dockerfile\.production "\$\{RUNNER_TEMP\}\/blog-image-context\/Dockerfile"/)
  assert.match(workflow, /cp nginx\.conf "\$\{RUNNER_TEMP\}\/blog-image-context\/nginx\.conf"/)
  assert.match(workflow, /cp -R dist "\$\{RUNNER_TEMP\}\/blog-image-context\/dist"/)
  assert.match(productionDockerfile, /FROM nginx:1\.27-alpine/)
  assert.match(productionDockerfile, /COPY nginx\.conf \/etc\/nginx\/conf\.d\/default\.conf/)
  assert.match(productionDockerfile, /COPY dist \/usr\/share\/nginx\/html/)
  assert.doesNotMatch(productionDockerfile, /node:24-alpine/)
  assert.doesNotMatch(productionDockerfile, /npm run/)
})

test('Docker build context excludes private source content by default', () => {
  assert.match(dockerIgnore, /^private-content$/m)
  assert.match(dockerIgnore, /^src\/content\/blog$/m)
  assert.match(dockerIgnore, /^src\/content\/reading$/m)
  assert.match(dockerIgnore, /^src\/content\/projects$/m)
  assert.match(dockerIgnore, /^public\/images\/blog$/m)
  assert.match(dockerIgnore, /^public\/images\/reading$/m)
  assert.match(dockerIgnore, /^public\/images\/projects$/m)
  assert.match(dockerIgnore, /^public\/files$/m)
})

test('production Compose file runs a published image instead of building on the server', () => {
  assert.match(productionCompose, /image: \$\{BLOG_IMAGE:\?Set BLOG_IMAGE/)
  assert.match(productionCompose, /healthcheck:/)
  assert.doesNotMatch(productionCompose, /build:/)
})
