#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const REPORT_SLUG = 'frontend-performance-origin-dev-vs-current'
const DEFAULT_REPORT_DIR = path.join(REPO_ROOT, 'backend/reports', REPORT_SLUG)
const DEFAULT_BASE_URL = 'http://127.0.0.1:3000'
const DEFAULT_BASELINE_REF = 'origin/dev'
const DEFAULT_PAGE_WARMUPS = 5
const DEFAULT_PAGE_ITERATIONS = 25
const DEFAULT_MUTATION_WARMUPS = 2
const DEFAULT_MUTATION_ITERATIONS = 10
const DEFAULT_TIMEOUT_MS = 30_000
const DOCKER_PROJECT_PREFIX = 'woong-blog-perf'
const SAVE_SHORTCUT = process.platform === 'darwin' ? 'Meta+s' : 'Control+s'
let chromiumBrowserType = null

const PUBLIC_ROUTES = [
  {
    key: 'home',
    area: 'Public cache/revalidation',
    name: 'Home',
    path: '/',
    ready: async (page) => {
      await page.getByTestId('featured-works-section').or(page.locator('main')).first().waitFor({ state: 'visible' })
    },
  },
  {
    key: 'blog',
    area: 'Public cache/revalidation',
    name: 'Study list',
    path: '/blog?page=1&pageSize=12&__qaTagged=1',
    ready: async (page) => {
      await page.getByRole('heading', { name: 'Study' }).waitFor({ state: 'visible' })
      await page.getByTestId('blog-card').first().waitFor({ state: 'visible' })
    },
  },
  {
    key: 'works',
    area: 'Public cache/revalidation',
    name: 'Works list',
    path: '/works?page=1&pageSize=8',
    ready: async (page) => {
      await page.getByRole('heading', { name: 'Works' }).waitFor({ state: 'visible' })
      await page.getByTestId('work-card').first().waitFor({ state: 'visible' })
    },
  },
  {
    key: 'contact',
    area: 'Public cache/revalidation',
    name: 'Contact',
    path: '/contact',
    ready: async (page) => {
      await page.getByTestId('static-public-shell').or(page.locator('main')).first().waitFor({ state: 'visible' })
    },
  },
  {
    key: 'introduction',
    area: 'Public cache/revalidation',
    name: 'Introduction',
    path: '/introduction',
    ready: async (page) => {
      await page.getByTestId('static-public-shell').or(page.locator('main')).first().waitFor({ state: 'visible' })
    },
  },
  {
    key: 'resume',
    area: 'Resume PDF SSR',
    name: 'Resume',
    path: '/resume',
    ready: async (page) => {
      await page.getByTestId('resume-shell').or(page.locator('main')).first().waitFor({ state: 'visible' })
    },
  },
]

const PUBLIC_API_ENDPOINTS = [
  ['public-api.home', 'Public cache/revalidation', 'Public API home', '/api/public/home'],
  ['public-api.blogs', 'Public cache/revalidation', 'Public API blogs', '/api/public/blogs?page=1&pageSize=12'],
  ['public-api.works', 'Public cache/revalidation', 'Public API works', '/api/public/works?page=1&pageSize=8'],
  ['public-api.page.contact', 'Public cache/revalidation', 'Public API contact page', '/api/public/pages/contact'],
  ['public-api.page.introduction', 'Public cache/revalidation', 'Public API introduction page', '/api/public/pages/introduction'],
  ['public-api.resume', 'Resume PDF SSR', 'Public API resume', '/api/public/resume'],
  ['public-api.site-settings', 'Public cache/revalidation', 'Public API site settings', '/api/public/site-settings'],
]

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    baselineRef: DEFAULT_BASELINE_REF,
    currentRefName: 'current-working-tree',
    reportDir: DEFAULT_REPORT_DIR,
    pageWarmups: DEFAULT_PAGE_WARMUPS,
    pageIterations: DEFAULT_PAGE_ITERATIONS,
    mutationWarmups: DEFAULT_MUTATION_WARMUPS,
    mutationIterations: DEFAULT_MUTATION_ITERATIONS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    httpPort: Number(new URL(DEFAULT_BASE_URL).port || 80),
    httpsPort: 3001,
    backendPort: 8080,
    keepDocker: false,
    keepWorktree: false,
    fetchBaseline: false,
    selfTest: false,
    currentOnly: false,
    noDocker: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = () => {
      index += 1
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}`)
      }
      return argv[index]
    }

    if (arg === '--base-url') options.baseUrl = next()
    else if (arg === '--baseline-ref') options.baselineRef = next()
    else if (arg === '--current-ref-name') options.currentRefName = next()
    else if (arg === '--report-dir') options.reportDir = path.resolve(next())
    else if (arg === '--warmups') options.pageWarmups = Number(next())
    else if (arg === '--iterations') options.pageIterations = Number(next())
    else if (arg === '--mutation-warmups') options.mutationWarmups = Number(next())
    else if (arg === '--mutation-iterations') options.mutationIterations = Number(next())
    else if (arg === '--timeout-ms') options.timeoutMs = Number(next())
    else if (arg === '--http-port') options.httpPort = Number(next())
    else if (arg === '--https-port') options.httpsPort = Number(next())
    else if (arg === '--backend-port') options.backendPort = Number(next())
    else if (arg === '--keep-docker') options.keepDocker = true
    else if (arg === '--keep-worktree') options.keepWorktree = true
    else if (arg === '--fetch-baseline') options.fetchBaseline = true
    else if (arg === '--self-test') options.selfTest = true
    else if (arg === '--current-only') options.currentOnly = true
    else if (arg === '--no-docker') options.noDocker = true
    else if (arg === '--quick') {
      options.pageWarmups = 1
      options.pageIterations = 2
      options.mutationWarmups = 0
      options.mutationIterations = 1
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  for (const [key, value] of Object.entries({
    pageWarmups: options.pageWarmups,
    pageIterations: options.pageIterations,
    mutationWarmups: options.mutationWarmups,
    mutationIterations: options.mutationIterations,
    timeoutMs: options.timeoutMs,
    httpPort: options.httpPort,
    httpsPort: options.httpsPort,
    backendPort: options.backendPort,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${key} must be a non-negative number.`)
    }
  }

  return options
}

function printHelp() {
  console.log(`Usage: node scripts/benchmark-frontend-performance.mjs [options]

Benchmarks origin/dev against the current working tree through Docker/nginx.

Options:
  --base-url <url>              Target public URL. Default: ${DEFAULT_BASE_URL}
  --baseline-ref <ref>          Baseline git ref. Default: ${DEFAULT_BASELINE_REF}
  --current-ref-name <name>     Label for current candidate.
  --report-dir <path>           Output directory. Default: ${DEFAULT_REPORT_DIR}
  --warmups <n>                 Warmup iterations for route/API/interaction metrics.
  --iterations <n>              Measured iterations for route/API/interaction metrics.
  --mutation-warmups <n>        Warmup iterations for admin mutation metrics.
  --mutation-iterations <n>     Measured iterations for admin mutation metrics.
  --http-port <n>               Nginx HTTP publish port. Default: 3000
  --https-port <n>              Nginx HTTPS publish port. Default: 3001
  --backend-port <n>            Backend publish port. Default: 8080
  --quick                       Small local smoke run: 1 warmup, 2 measured, 1 mutation.
  --current-only                Benchmark only the current working tree.
  --no-docker                   Reuse an already running app at --base-url.
  --fetch-baseline              Run git fetch origin dev before creating the baseline worktree.
  --keep-docker                 Do not docker compose down after a candidate.
  --keep-worktree               Keep the temporary baseline worktree.
  --self-test                   Generate reports from synthetic samples for validation.
`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.selfTest) {
    const report = buildSyntheticReport(options)
    const paths = await writeReports(report, options.reportDir)
    console.log(`Self-test report written: ${paths.jsonPath}`)
    return
  }

  await assertPluginCachePaths()

  const startedAt = new Date().toISOString()
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'woong-blog-perf-'))
  const report = {
    slug: REPORT_SLUG,
    generatedAt: new Date().toISOString(),
    startedAt,
    completedAt: null,
    environment: await collectEnvironment(options),
    candidates: [],
    comparisons: [],
    areaRecommendations: [],
    reportPaths: {},
  }

  let baselineWorktree = null
  try {
    if (!options.currentOnly) {
      if (options.fetchBaseline) {
        await runCommand('git', ['fetch', 'origin', 'dev'], { cwd: REPO_ROOT })
      }

      baselineWorktree = path.join(tmpRoot, 'origin-dev-worktree')
      await runCommand('git', ['worktree', 'add', '--detach', baselineWorktree, options.baselineRef], { cwd: REPO_ROOT })
      report.candidates.push(await benchmarkCandidate({
        label: 'Baseline',
        key: 'baseline',
        ref: options.baselineRef,
        workdir: baselineWorktree,
        tmpRoot,
        options,
      }))
    }

    report.candidates.push(await benchmarkCandidate({
      label: 'Current',
      key: 'current',
      ref: options.currentRefName,
      workdir: REPO_ROOT,
      tmpRoot,
      options,
    }))

    report.completedAt = new Date().toISOString()
    report.comparisons = buildComparisons(report.candidates)
    report.areaRecommendations = buildAreaRecommendations(report.comparisons)
  } finally {
    if (baselineWorktree && !options.keepWorktree) {
      await runCommand('git', ['worktree', 'remove', '--force', baselineWorktree], { cwd: REPO_ROOT, allowFailure: true })
    }
  }

  const paths = await writeReports(report, options.reportDir)
  report.reportPaths = paths
  await fs.writeFile(paths.jsonPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Wrote ${paths.mdPath}`)
  console.log(`Wrote ${paths.htmlPath}`)
  console.log(`Wrote ${paths.jsonPath}`)
}

async function assertPluginCachePaths() {
  const cache = '/home/kimwoonggon/.codex/plugins/cache'
  const tmp = '/home/kimwoonggon/.codex/.tmp/plugins'
  await fs.mkdir(cache, { recursive: true })
  await fs.mkdir(tmp, { recursive: true })
  const [cacheReal, tmpReal] = await Promise.all([fs.realpath(cache), fs.realpath(tmp)])
  if (!path.isAbsolute(cacheReal) || !path.isAbsolute(tmpReal)) {
    throw new Error(`Plugin cache paths must resolve to absolute paths: ${cacheReal}, ${tmpReal}`)
  }
}

async function collectEnvironment(options) {
  const [currentBranch, currentCommit, baselineCommit, dockerVersion, nodeVersion] = await Promise.all([
    captureCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: REPO_ROOT }),
    captureCommand('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT }),
    captureCommand('git', ['rev-parse', options.baselineRef], { cwd: REPO_ROOT, allowFailure: true }),
    captureCommand(resolveDockerBin(), ['--version'], { cwd: REPO_ROOT, allowFailure: true }),
    Promise.resolve(process.version),
  ])

  return {
    baseUrl: options.baseUrl,
    currentBranch: currentBranch.trim(),
    currentCommit: currentCommit.trim(),
    baselineRef: options.baselineRef,
    baselineCommit: baselineCommit.trim() || 'unresolved',
    nodeVersion,
    platform: `${process.platform} ${process.arch}`,
    hostname: os.hostname(),
    dockerVersion: dockerVersion.trim() || 'unavailable',
    playwrightBrowser: 'chromium',
    workers: 1,
    httpPort: options.httpPort,
    httpsPort: options.httpsPort,
    backendPort: options.backendPort,
    routeWarmups: options.pageWarmups,
    routeIterations: options.pageIterations,
    mutationWarmups: options.mutationWarmups,
    mutationIterations: options.mutationIterations,
  }
}

async function benchmarkCandidate({ label, key, ref, workdir, tmpRoot, options }) {
  const dockerProject = `${DOCKER_PROJECT_PREFIX}-${key}`
  const candidateTmp = path.join(tmpRoot, key)
  const startedAt = new Date().toISOString()
  const result = {
    key,
    label,
    ref,
    commit: (await captureCommand('git', ['rev-parse', 'HEAD'], { cwd: workdir, allowFailure: true })).trim(),
    workdir,
    dockerProject: options.noDocker ? null : dockerProject,
    startedAt,
    completedAt: null,
    seed: null,
    scenarios: [],
    notes: [],
  }

  try {
    if (!options.noDocker) {
      await prepareEnvFile(workdir)
      await startDockerCandidate({ workdir, dockerProject, candidateTmp, options })
    }

    await waitForAppReady(options.baseUrl, options.timeoutMs)

    const session = new HttpSession(options.baseUrl)
    await session.ensureAdminSession()
    const seed = await seedCandidateData(session, key)
    result.seed = seed

    const chromium = await getChromiumBrowserType()
    const browser = await chromium.launch()
    try {
      const publicContext = await browser.newContext({ baseURL: options.baseUrl, viewport: { width: 1280, height: 960 } })
      const adminContext = await browser.newContext({ baseURL: options.baseUrl, viewport: { width: 1280, height: 960 } })
      await bootstrapAdminBrowserContext(adminContext, options.baseUrl)

      await runPublicRouteBenchmarks(result, publicContext, options)
      await runPublicApiBenchmarks(result, session, options)
      await runPaginationBenchmarks(result, publicContext, options)
      await runAdminEditorBenchmarks(result, adminContext, seed, options)
      await runAiDialogBenchmark(result, adminContext, session, options)
      await runAdminMutationRefreshBenchmarks(result, adminContext, seed, options)

      await publicContext.close()
      await adminContext.close()
    } finally {
      await browser.close()
    }
  } catch (error) {
    result.notes.push(`Candidate failed: ${stringifyError(error)}`)
  } finally {
    result.completedAt = new Date().toISOString()
    if (!options.noDocker && !options.keepDocker) {
      await stopDockerCandidate({ workdir, dockerProject })
    }
  }

  return result
}

async function prepareEnvFile(workdir) {
  const envPath = path.join(workdir, '.env')
  const examplePath = path.join(workdir, '.env.example')
  if (!existsSync(envPath) && existsSync(examplePath)) {
    await fs.copyFile(examplePath, envPath)
  }
}

async function startDockerCandidate({ workdir, dockerProject, candidateTmp, options }) {
  await fs.mkdir(candidateTmp, { recursive: true })
  const postgresDataDir = path.join(candidateTmp, 'postgres')
  await fs.mkdir(postgresDataDir, { recursive: true })

  const env = {
    ...process.env,
    CODEX_HOME_DIR: '/home/kimwoonggon/.codex',
    NGINX_DEFAULT_CONF: './nginx/default.conf',
    NGINX_BIND_HOST: '127.0.0.1',
    NGINX_HTTP_PORT: String(options.httpPort),
    NGINX_HTTPS_PORT: String(options.httpsPort),
    BACKEND_BIND_HOST: '127.0.0.1',
    BACKEND_PUBLISH_PORT: String(options.backendPort),
    POSTGRES_DATA_DIR: postgresDataDir,
    APP_ENV_FILE: '.env',
  }

  await runCommand(resolveDockerBin(), ['compose', '-p', dockerProject, '-f', 'docker-compose.dev.yml', 'down', '-v'], {
    cwd: workdir,
    env,
    allowFailure: true,
  })
  await runCommand(resolveDockerBin(), ['compose', '-p', dockerProject, '-f', 'docker-compose.dev.yml', 'up', '--build', '-d', 'db', 'frontend', 'backend', 'nginx'], {
    cwd: workdir,
    env,
  })
}

async function stopDockerCandidate({ workdir, dockerProject }) {
  await runCommand(resolveDockerBin(), ['compose', '-p', dockerProject, '-f', 'docker-compose.dev.yml', 'down', '-v'], {
    cwd: workdir,
    env: { ...process.env, CODEX_HOME_DIR: '/home/kimwoonggon/.codex' },
    allowFailure: true,
  })
}

function resolveDockerBin() {
  if (process.env.DOCKER_BIN) {
    return process.env.DOCKER_BIN
  }

  return 'docker'
}

async function getChromiumBrowserType() {
  if (!chromiumBrowserType) {
    const playwright = await import('@playwright/test')
    chromiumBrowserType = playwright.chromium
  }

  return chromiumBrowserType
}

async function waitForAppReady(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL('/login', baseUrl), { redirect: 'follow' })
      const body = await response.text()
      const sessionResponse = await fetch(new URL('/api/auth/session', baseUrl), { redirect: 'follow' })
      if (response.ok && body.includes('Sign in') && sessionResponse.ok) {
        return
      }
      lastError = new Error(`Unexpected readiness response /login=${response.status}, /api/auth/session=${sessionResponse.status}`)
    } catch (error) {
      lastError = error
    }
    await delay(1000)
  }

  throw new Error(`Timed out waiting for ${baseUrl}/login. Last error: ${stringifyError(lastError)}`)
}

async function seedCandidateData(session, key) {
  const stamp = `perf-${key}-${Date.now().toString(36).slice(-6)}`
  const seed = {
    stamp,
    blogs: [],
    works: [],
    editableBlog: null,
    editableWork: null,
    pages: [],
    siteSettingsOwnerName: `Perf Owner ${key} ${Date.now()}`,
    resumeAsset: null,
  }

  for (let index = 1; index <= 26; index += 1) {
    const title = `Perf Study ${key} ${String(index).padStart(2, '0')} ${stamp}`
    const payload = await session.postJson('/api/admin/blogs', {
      title,
      tags: ['benchmark', stamp, `study-${index}`],
      published: true,
      contentJson: JSON.stringify({ html: `<p>${title} benchmark body.</p>` }),
    })
    seed.blogs.push({ id: payload.id, slug: payload.slug, title })
  }

  for (let index = 1; index <= 18; index += 1) {
    const title = `Perf Work ${key} ${String(index).padStart(2, '0')} ${stamp}`
    const payload = await session.postJson('/api/admin/works', {
      title,
      category: 'Benchmark',
      period: '2026',
      tags: ['benchmark', stamp, `work-${index}`],
      published: true,
      contentJson: JSON.stringify({ html: `<p>${title} benchmark body.</p>` }),
      allPropertiesJson: '{}',
    })
    seed.works.push({ id: payload.id, slug: payload.slug, title })
  }

  seed.editableBlog = seed.blogs[0]
  seed.editableWork = seed.works[0]

  const pages = await session.getJson('/api/admin/pages?slugs=home&slugs=introduction&slugs=contact')
  if (Array.isArray(pages)) {
    for (const page of pages) {
      const html = `<p>Benchmark ${page.slug} content ${stamp}</p>`
      const contentJson = page.slug === 'home'
        ? JSON.stringify({ headline: `Benchmark home ${stamp}`, subtitle: `Home seed ${stamp}` })
        : JSON.stringify({ html })
      await session.putJson('/api/admin/pages', {
        id: page.id,
        title: page.title || page.slug,
        contentJson,
      })
      seed.pages.push({ id: page.id, slug: page.slug })
    }
  }

  await session.putJson('/api/admin/site-settings', {
    ownerName: seed.siteSettingsOwnerName,
    tagline: `Benchmark tagline ${stamp}`,
    githubUrl: 'https://github.com/example',
  })

  try {
    seed.resumeAsset = await uploadResumeFixture(session)
    await session.putJson('/api/admin/site-settings', { resumeAssetId: seed.resumeAsset.id })
  } catch (error) {
    seed.resumeAsset = { error: stringifyError(error) }
  }

  return seed
}

async function uploadResumeFixture(session) {
  const fixturePath = path.join(REPO_ROOT, 'tests/fixtures/resume.pdf')
  const bytes = await fs.readFile(fixturePath)
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), 'resume.pdf')
  form.append('bucket', 'public-resume')
  return await session.requestJson('/api/uploads', {
    method: 'POST',
    body: form,
    csrf: true,
  })
}

async function bootstrapAdminBrowserContext(context, baseUrl) {
  const page = await context.newPage()
  await page.goto(new URL('/api/auth/test-login?email=admin@example.com&returnUrl=%2Fadmin%2Fdashboard', baseUrl).toString())
  await page.waitForLoadState('domcontentloaded')
  await page.close()
}

async function runPublicRouteBenchmarks(result, context, options) {
  for (const route of PUBLIC_ROUTES) {
    await recordColdPageLoad(result, context, route)
    await warmup(() => measurePageLoad(context, route), options.pageWarmups)
    const samples = await collectSamples(() => measurePageLoad(context, route), options.pageIterations)
    addMetricScenario(result, {
      id: `public-route.${route.key}.primary-visible`,
      area: route.area,
      name: `${route.name} warm load to primary content visible`,
      metric: 'time-to-primary-content-ms',
      samples: samples.map((sample) => sample.primaryVisibleMs),
      notes: samples.flatMap((sample) => sample.note ? [sample.note] : []),
    })
    addMetricScenario(result, {
      id: `public-route.${route.key}.navigation`,
      area: route.area,
      name: `${route.name} warm browser navigation`,
      metric: 'browser-navigation-duration-ms',
      samples: samples.map((sample) => sample.navigationDurationMs),
    })
    addMetricScenario(result, {
      id: `public-route.${route.key}.ttfb`,
      area: route.area,
      name: `${route.name} warm route TTFB`,
      metric: 'route-ttfb-ms',
      samples: samples.map((sample) => sample.ttfbMs),
    })
  }
}

async function recordColdPageLoad(result, context, route) {
  const sample = await measurePageLoad(context, route)
  addMetricScenario(result, {
    id: `public-route.${route.key}.cold-primary-visible`,
    area: route.area,
    name: `${route.name} cold first load to primary content visible`,
    metric: 'time-to-primary-content-ms',
    samples: sample.primaryVisibleMs == null ? [] : [sample.primaryVisibleMs],
    notes: sample.note ? [sample.note] : [],
  })
}

async function measurePageLoad(context, route) {
  const page = await context.newPage()
  const started = performance.now()

  try {
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS })
    await route.ready(page)
    const primaryVisibleMs = round(performance.now() - started)
    const nav = await page.evaluate(() => {
      const entry = performance.getEntriesByType('navigation')[0]
      if (!entry) {
        return null
      }
      const navigation = entry.toJSON()
      return {
        duration: navigation.duration,
        responseStart: navigation.responseStart,
      }
    })
    return {
      ok: true,
      status: response?.status(),
      primaryVisibleMs,
      navigationDurationMs: round(nav?.duration ?? primaryVisibleMs),
      ttfbMs: round(nav?.responseStart ?? 0),
    }
  } catch (error) {
    return {
      ok: false,
      primaryVisibleMs: null,
      navigationDurationMs: null,
      ttfbMs: null,
      note: stringifyError(error),
    }
  } finally {
    await page.close().catch(() => {})
  }
}

async function runPublicApiBenchmarks(result, session, options) {
  for (const [id, area, name, endpoint] of PUBLIC_API_ENDPOINTS) {
    await warmup(() => measureApi(session, endpoint), options.pageWarmups)
    const samples = await collectSamples(() => measureApi(session, endpoint), options.pageIterations)
    addMetricScenario(result, {
      id,
      area,
      name,
      metric: 'api-response-duration-ms',
      samples: samples.filter((sample) => sample.ok).map((sample) => sample.durationMs),
      notes: samples.filter((sample) => !sample.ok).map((sample) => `${sample.status ?? 'error'} ${sample.note ?? ''}`.trim()),
    })
  }
}

async function measureApi(session, endpoint) {
  const started = performance.now()
  try {
    const response = await session.request(endpoint, { method: 'GET' })
    const body = await response.text()
    return {
      ok: response.ok,
      status: response.status,
      durationMs: round(performance.now() - started),
      note: response.ok ? null : body,
    }
  } catch (error) {
    return { ok: false, durationMs: round(performance.now() - started), note: stringifyError(error) }
  }
}

async function runPaginationBenchmarks(result, context, options) {
  const scenarios = [
    {
      id: 'pagination.study.next',
      area: 'Study/Works pagination',
      name: 'Study Next click to page 2 grid visible',
      path: '/blog?page=1&pageSize=12&__qaTagged=1',
      paginationLabel: 'Study pagination',
      direction: 'Next',
      expectedPage: '2',
      cardTestId: 'blog-card',
    },
    {
      id: 'pagination.study.previous',
      area: 'Study/Works pagination',
      name: 'Study Previous click to page 1 grid visible',
      path: '/blog?page=2&pageSize=12&__qaTagged=1',
      paginationLabel: 'Study pagination',
      direction: 'Previous',
      expectedPage: '1',
      cardTestId: 'blog-card',
    },
    {
      id: 'pagination.works.next',
      area: 'Study/Works pagination',
      name: 'Works Next click to page 2 grid visible',
      path: '/works?page=1&pageSize=8',
      paginationLabel: 'Works pagination',
      direction: 'Next',
      expectedPage: '2',
      cardTestId: 'work-card',
    },
    {
      id: 'pagination.works.previous',
      area: 'Study/Works pagination',
      name: 'Works Previous click to page 1 grid visible',
      path: '/works?page=2&pageSize=8',
      paginationLabel: 'Works pagination',
      direction: 'Previous',
      expectedPage: '1',
      cardTestId: 'work-card',
    },
  ]

  for (const scenario of scenarios) {
    await warmup(() => measurePaginationClick(context, scenario), options.pageWarmups)
    const samples = await collectSamples(() => measurePaginationClick(context, scenario), options.pageIterations)
    addMetricScenario(result, {
      id: scenario.id,
      area: scenario.area,
      name: scenario.name,
      metric: 'interaction-to-ready-ms',
      samples: samples.filter((sample) => sample.ok).map((sample) => sample.durationMs),
      notes: samples.filter((sample) => !sample.ok).map((sample) => sample.note),
    })
  }

  for (const route of [
    { ...PUBLIC_ROUTES[1], key: 'blog-page-2', name: 'Study direct page 2', path: '/blog?page=2&pageSize=12&__qaTagged=1' },
    { ...PUBLIC_ROUTES[2], key: 'works-page-2', name: 'Works direct page 2', path: '/works?page=2&pageSize=8' },
  ]) {
    await warmup(() => measurePageLoad(context, route), options.pageWarmups)
    const samples = await collectSamples(() => measurePageLoad(context, route), options.pageIterations)
    addMetricScenario(result, {
      id: `pagination.${route.key}.direct-load`,
      area: 'Study/Works pagination',
      name: `${route.name} load to grid visible`,
      metric: 'time-to-primary-content-ms',
      samples: samples.map((sample) => sample.primaryVisibleMs),
      notes: samples.flatMap((sample) => sample.note ? [sample.note] : []),
    })
  }
}

async function measurePaginationClick(context, scenario) {
  const page = await context.newPage()
  try {
    await page.goto(scenario.path, { waitUntil: 'domcontentloaded' })
    await page.getByTestId(scenario.cardTestId).first().waitFor({ state: 'visible' })
    const pageLink = page
      .getByLabel(scenario.paginationLabel)
      .locator(`a[href*="page=${scenario.expectedPage}"]`)
      .filter({ hasText: scenario.direction })
      .first()
    await pageLink.waitFor({ state: 'visible' })
    const started = performance.now()
    await pageLink.click()
    await page.waitForURL((url) => url.searchParams.get('page') === scenario.expectedPage, { timeout: DEFAULT_TIMEOUT_MS })
    await page.getByTestId(scenario.cardTestId).first().waitFor({ state: 'visible' })
    const activePage = new URL(page.url()).searchParams.get('page')
    if (activePage !== scenario.expectedPage) {
      throw new Error(`Expected page=${scenario.expectedPage}, got page=${activePage}`)
    }
    return { ok: true, durationMs: round(performance.now() - started) }
  } catch (error) {
    return { ok: false, durationMs: null, note: stringifyError(error) }
  } finally {
    await page.close().catch(() => {})
  }
}

async function runAdminEditorBenchmarks(result, context, seed, options) {
  await warmup(() => measureAdminEditorOpen(context, seed.editableBlog), options.pageWarmups)
  const blogOpenSamples = await collectSamples(() => measureAdminEditorOpen(context, seed.editableBlog), options.pageIterations)
  addMetricScenario(result, {
    id: 'admin.blog-editor.open',
    area: 'Admin editor UX',
    name: 'Blog editor open to form ready',
    metric: 'time-to-form-ready-ms',
    samples: blogOpenSamples.filter((sample) => sample.ok).map((sample) => sample.durationMs),
    notes: blogOpenSamples.filter((sample) => !sample.ok).map((sample) => sample.note),
    correctness: collectTopSaveNotes(blogOpenSamples),
  })

  await warmup(() => measureBlogSave(context, seed, 'bottom'), options.mutationWarmups)
  const bottomSaveSamples = await collectSamples(() => measureBlogSave(context, seed, 'bottom'), options.mutationIterations)
  addMetricScenario(result, {
    id: 'admin.blog-editor.bottom-save',
    area: 'Admin editor UX',
    name: 'Blog bottom save to saved/navigation state',
    metric: 'mutation-to-navigation-ready-ms',
    samples: bottomSaveSamples.filter((sample) => sample.ok).map((sample) => sample.durationMs),
    notes: bottomSaveSamples.filter((sample) => !sample.ok).map((sample) => sample.note),
  })

  await warmup(() => measureBlogSave(context, seed, 'keyboard'), options.mutationWarmups)
  const keyboardSaveSamples = await collectSamples(() => measureBlogSave(context, seed, 'keyboard'), options.mutationIterations)
  addMetricScenario(result, {
    id: 'admin.blog-editor.keyboard-save',
    area: 'Admin editor UX',
    name: 'Blog keyboard save to saved/navigation state',
    metric: 'mutation-to-navigation-ready-ms',
    samples: keyboardSaveSamples.filter((sample) => sample.ok).map((sample) => sample.durationMs),
    notes: keyboardSaveSamples.filter((sample) => !sample.ok).map((sample) => sample.note),
  })

  await warmup(() => measureWorkSave(context, seed), options.mutationWarmups)
  const workSaveSamples = await collectSamples(() => measureWorkSave(context, seed), options.mutationIterations)
  addMetricScenario(result, {
    id: 'admin.work-editor.save',
    area: 'Admin editor UX',
    name: 'Work editor save to saved/navigation state',
    metric: 'mutation-to-navigation-ready-ms',
    samples: workSaveSamples.filter((sample) => sample.ok).map((sample) => sample.durationMs),
    notes: workSaveSamples.filter((sample) => !sample.ok).map((sample) => sample.note),
  })
}

async function measureAdminEditorOpen(context, editableBlog) {
  const page = await context.newPage()
  const started = performance.now()
  try {
    await page.goto(`/admin/blog/${editableBlog.id}`, { waitUntil: 'domcontentloaded' })
    await waitForBlogEditorReady(page)
    const updateButtonCount = await page.getByRole('button', { name: 'Update Post' }).count().catch(() => null)
    return {
      ok: true,
      durationMs: round(performance.now() - started),
      topSaveRemoved: updateButtonCount === 1,
      correctnessNote: updateButtonCount === 1
        ? 'Only one Update Post action is present; top save action is absent.'
        : `${updateButtonCount ?? 'unknown'} Update Post actions detected; top save state requires review.`,
    }
  } catch (error) {
    return { ok: false, durationMs: null, note: stringifyError(error) }
  } finally {
    await page.close().catch(() => {})
  }
}

function collectTopSaveNotes(samples) {
  const note = samples.find((sample) => sample.correctnessNote)?.correctnessNote
  return note ? [note] : []
}

async function measureBlogSave(context, seed, mode) {
  const page = await context.newPage()
  const title = `Perf Blog ${mode} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`
  try {
    await page.goto(`/admin/blog/${seed.editableBlog.id}`, { waitUntil: 'domcontentloaded' })
    await fillHydratedTitleInput(page, title, 'blog')
    const saveButton = page.getByRole('button', { name: 'Update Post' }).first()
    await waitForLocatorEnabled(saveButton)

    const started = performance.now()
    const [saveResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok()),
      mode === 'keyboard' ? page.keyboard.press(SAVE_SHORTCUT) : saveButton.click(),
    ])
    await page.waitForURL(/\/admin\/blog(?:\?|$)/, { timeout: DEFAULT_TIMEOUT_MS }).catch(() => {})
    const payload = await saveResponse.json().catch(() => null)
    if (payload?.slug) {
      seed.editableBlog.slug = payload.slug
    }
    seed.editableBlog.title = title
    return { ok: true, durationMs: round(performance.now() - started) }
  } catch (error) {
    return { ok: false, durationMs: null, note: stringifyError(error) }
  } finally {
    await page.close().catch(() => {})
  }
}

async function measureWorkSave(context, seed) {
  const page = await context.newPage()
  const title = `Perf Work save ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`
  try {
    await page.goto(`/admin/works/${seed.editableWork.id}`, { waitUntil: 'domcontentloaded' })
    await fillHydratedTitleInput(page, title, 'work')
    const saveButton = page.getByRole('button', { name: 'Update Work' }).first()
    await waitForLocatorEnabled(saveButton)
    const started = performance.now()
    const [saveResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/works/') && res.request().method() === 'PUT' && res.ok()),
      saveButton.click(),
    ])
    await page.waitForURL(/\/admin\/works(?:\?|$)/, { timeout: DEFAULT_TIMEOUT_MS }).catch(() => {})
    const payload = await saveResponse.json().catch(() => null)
    if (payload?.slug) {
      seed.editableWork.slug = payload.slug
    }
    seed.editableWork.title = title
    return { ok: true, durationMs: round(performance.now() - started) }
  } catch (error) {
    return { ok: false, durationMs: null, note: stringifyError(error) }
  } finally {
    await page.close().catch(() => {})
  }
}

async function runAiDialogBenchmark(result, context, session, options) {
  const runtimeConfig = await measureRuntimeConfig(session)
  await warmup(() => measureAiDialogOpen(context), options.pageWarmups)
  const samples = await collectSamples(() => measureAiDialogOpen(context), options.pageIterations)
  addMetricScenario(result, {
    id: 'ai-fix-dialog.open',
    area: 'AI Fix dialog',
    name: 'AI Fix click to runtime config and provider dropdown visible',
    metric: 'interaction-to-provider-ready-ms',
    samples: samples.filter((sample) => sample.ok).map((sample) => sample.durationMs),
    notes: [
      ...samples.filter((sample) => !sample.ok).map((sample) => sample.note),
      runtimeConfig.ok
        ? `Runtime providers: ${runtimeConfig.providers.join(', ') || 'none'}`
        : `Runtime config failed: ${runtimeConfig.note}`,
    ],
    correctness: runtimeConfig.ok && (!runtimeConfig.providers.includes('openai') || !runtimeConfig.providers.includes('codex'))
      ? [`Provider correctness issue: expected OPENAI and CODEX when OpenAI/Codex access is configured; got ${runtimeConfig.providers.join(', ') || 'none'}.`]
      : [],
    details: { runtimeConfig },
  })
}

async function measureRuntimeConfig(session) {
  const started = performance.now()
  try {
    const payload = await session.getJson('/api/admin/ai/runtime-config')
    const providers = Array.isArray(payload.availableProviders)
      ? payload.availableProviders.map((provider) => String(provider).toLowerCase())
      : [String(payload.provider ?? '').toLowerCase()].filter(Boolean)
    return { ok: true, durationMs: round(performance.now() - started), providers, payload }
  } catch (error) {
    return { ok: false, durationMs: round(performance.now() - started), providers: [], note: stringifyError(error) }
  }
}

async function measureAiDialogOpen(context) {
  const page = await context.newPage()
  try {
    await page.goto('/admin/blog/new', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Title').fill(`Perf AI ${Date.now()}`)
    await page.locator('form .tiptap.ProseMirror').first().click()
    await page.keyboard.type('benchmark AI dialog content')

    const started = performance.now()
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/admin/ai/runtime-config') && response.ok()),
      page.getByRole('button', { name: 'AI Content Fixer' }).click(),
    ])
    await page.getByRole('heading', { name: 'AI Content Fixer' }).waitFor({ state: 'visible' })
    await page.getByText('Provider').first().waitFor({ state: 'visible' }).catch(() => {})
    const providerSelect = page.getByLabel('AI provider')
    const providers = await providerSelect.locator('option').allTextContents().catch(async () => {
      const visibleText = await page.locator('[role="dialog"]').textContent().catch(() => '')
      return ['OPENAI', 'CODEX'].filter((provider) => visibleText?.includes(provider))
    })
    return { ok: true, durationMs: round(performance.now() - started), providers }
  } catch (error) {
    return { ok: false, durationMs: null, note: stringifyError(error) }
  } finally {
    await page.close().catch(() => {})
  }
}

async function runAdminMutationRefreshBenchmarks(result, context, seed, options) {
  const scenarios = [
    {
      id: 'admin-mutation.blog-public-refresh',
      area: 'Public cache/revalidation',
      name: 'Admin blog save to public route refreshed and visible',
      run: () => measureBlogSaveToPublic(context, seed),
    },
    {
      id: 'admin-mutation.work-public-refresh',
      area: 'Public cache/revalidation',
      name: 'Admin work save to public route refreshed and visible',
      run: () => measureWorkSaveToPublic(context, seed),
    },
    {
      id: 'admin-mutation.resume-upload-public-refresh',
      area: 'Resume PDF SSR',
      name: 'Admin resume upload to public resume visible',
      run: () => measureResumeUploadToPublic(context),
    },
  ]

  for (const scenario of scenarios) {
    await warmup(scenario.run, options.mutationWarmups)
    const samples = await collectSamples(scenario.run, options.mutationIterations)
    addMetricScenario(result, {
      id: scenario.id,
      area: scenario.area,
      name: scenario.name,
      metric: 'mutation-to-public-visible-ms',
      samples: samples.filter((sample) => sample.ok).map((sample) => sample.durationMs),
      notes: samples.filter((sample) => !sample.ok).map((sample) => sample.note),
    })
  }
}

async function measureBlogSaveToPublic(context, seed) {
  const page = await context.newPage()
  const title = `Perf Blog Public ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`
  try {
    await page.goto(`/admin/blog/${seed.editableBlog.id}`, { waitUntil: 'domcontentloaded' })
    await fillHydratedTitleInput(page, title, 'blog')
    const saveButton = page.getByRole('button', { name: 'Update Post' }).first()
    await waitForLocatorEnabled(saveButton)
    const started = performance.now()
    const [saveResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/blogs/') && res.request().method() === 'PUT' && res.ok()),
      page.waitForResponse((res) => res.url().includes('/revalidate-public') && res.request().method() === 'POST' && res.ok()).catch(() => null),
      saveButton.click(),
    ])
    const payload = await saveResponse.json().catch(() => null)
    const slug = payload?.slug ?? seed.editableBlog.slug
    seed.editableBlog.slug = slug
    seed.editableBlog.title = title
    await page.goto(`/blog/${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded' })
    await page.locator('main h1', { hasText: title }).waitFor({ state: 'visible' })
    return { ok: true, durationMs: round(performance.now() - started) }
  } catch (error) {
    return { ok: false, durationMs: null, note: stringifyError(error) }
  } finally {
    await page.close().catch(() => {})
  }
}

async function measureWorkSaveToPublic(context, seed) {
  const page = await context.newPage()
  const title = `Perf Work Public ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`
  try {
    await page.goto(`/admin/works/${seed.editableWork.id}`, { waitUntil: 'domcontentloaded' })
    await fillHydratedTitleInput(page, title, 'work')
    const saveButton = page.getByRole('button', { name: 'Update Work' }).first()
    await waitForLocatorEnabled(saveButton)
    const started = performance.now()
    const [saveResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/works/') && res.request().method() === 'PUT' && res.ok()),
      page.waitForResponse((res) => res.url().includes('/revalidate-public') && res.request().method() === 'POST' && res.ok()).catch(() => null),
      saveButton.click(),
    ])
    const payload = await saveResponse.json().catch(() => null)
    const slug = payload?.slug ?? seed.editableWork.slug
    seed.editableWork.slug = slug
    seed.editableWork.title = title
    await page.goto(`/works/${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded' })
    await page.locator('main h1', { hasText: title }).waitFor({ state: 'visible' })
    return { ok: true, durationMs: round(performance.now() - started) }
  } catch (error) {
    return { ok: false, durationMs: null, note: stringifyError(error) }
  } finally {
    await page.close().catch(() => {})
  }
}

async function measureResumeUploadToPublic(context) {
  const page = await context.newPage()
  try {
    page.on('dialog', (dialog) => {
      void dialog.accept().catch(() => {})
    })
    await page.goto('/admin/pages', { waitUntil: 'domcontentloaded' })
    const resumeSection = page.locator('#resume-editor')
    await resumeSection.getByText('Resume Management').waitFor({ state: 'visible' })
    if (await resumeSection.getByText('Resume PDF Uploaded').isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/admin/site-settings') && res.request().method() === 'PUT').catch(() => null),
        page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'DELETE').catch(() => null),
        resumeSection.getByRole('button', { name: 'Delete resume' }).click(),
      ])
      await resumeSection.getByText('No resume uploaded yet.').waitFor({ state: 'visible' })
    }
    const fileInput = resumeSection.locator('#resume-upload')
    const started = performance.now()
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/uploads') && res.request().method() === 'POST' && res.ok()),
      page.waitForResponse((res) => res.url().includes('/api/admin/site-settings') && res.request().method() === 'PUT' && res.ok()),
      page.waitForResponse((res) => res.url().includes('/revalidate-public') && res.request().method() === 'POST' && res.ok()).catch(() => null),
      fileInput.setInputFiles(path.join(REPO_ROOT, 'tests/fixtures/resume.pdf')),
    ])
    await page.goto('/resume', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('resume-shell').waitFor({ state: 'visible' })
    await page.getByRole('link', { name: /download/i }).first().waitFor({ state: 'visible' })
    return { ok: true, durationMs: round(performance.now() - started) }
  } catch (error) {
    return { ok: false, durationMs: null, note: stringifyError(error) }
  } finally {
    await page.close().catch(() => {})
  }
}

async function warmup(fn, count) {
  for (let index = 0; index < count; index += 1) {
    await fn().catch(() => null)
  }
}

async function fillHydratedTitleInput(page, title, editorKind) {
  if (editorKind === 'blog') {
    await waitForBlogEditorReady(page)
  } else {
    await page.getByRole('heading', { name: 'Edit Work' }).waitFor({ state: 'visible' }).catch(() => {})
  }
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

  const titleInput = page.locator('input[name="title"]').first()
  await titleInput.waitFor({ state: 'visible' })
  await titleInput.fill(title)
  await titleInput.click()
  await page.waitForFunction((expectedTitle) => {
    const input = document.querySelector('input[name="title"]')
    return input instanceof HTMLInputElement && input.value === expectedTitle
  }, title, { timeout: 5000 })
  return titleInput
}

async function waitForBlogEditorReady(page) {
  await page.locator('input[name="title"]').first().waitFor({ state: 'visible' })
  const tiptap = page.locator('form .tiptap.ProseMirror, [contenteditable="true"]').first()
  await tiptap.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS }).catch(() => {})
}

async function waitForLocatorEnabled(locator, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs
  let lastError = null

  await locator.waitFor({ state: 'visible', timeout: Math.min(timeoutMs, 5000) })

  while (Date.now() < deadline) {
    try {
      if (await locator.evaluate((element) => !(element instanceof HTMLButtonElement) || !element.disabled)) {
        return
      }
    } catch (error) {
      lastError = error
    }
    await delay(100)
  }

  const snapshot = await locator.evaluate((element) => ({
    tagName: element.tagName,
    disabled: element instanceof HTMLButtonElement ? element.disabled : null,
    text: element.textContent,
    type: element instanceof HTMLButtonElement ? element.type : null,
  })).catch((error) => ({ error: stringifyError(error) }))
  throw new Error(`Timed out waiting for locator to become enabled: ${JSON.stringify(snapshot)}; last error: ${stringifyError(lastError)}`)
}

async function collectSamples(fn, count) {
  const samples = []
  for (let index = 0; index < count; index += 1) {
    samples.push(await fn())
  }
  return samples
}

function addMetricScenario(result, scenario) {
  const samples = scenario.samples.filter((value) => Number.isFinite(value))
  const notes = Array.from(new Set((scenario.notes ?? []).filter(Boolean).map(String)))
  const correctness = Array.from(new Set((scenario.correctness ?? []).filter(Boolean).map(String)))
  result.scenarios.push({
    id: scenario.id,
    area: scenario.area,
    name: scenario.name,
    metric: scenario.metric,
    status: samples.length > 0 ? 'passed' : 'failed',
    sampleCount: samples.length,
    samples,
    stats: summarizeSamples(samples),
    notes,
    correctness,
    details: scenario.details ?? {},
  })
}

function summarizeSamples(samples) {
  if (!samples.length) {
    return null
  }
  const sorted = [...samples].sort((a, b) => a - b)
  return {
    min: round(sorted[0]),
    median: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    max: round(sorted[sorted.length - 1]),
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return null
  if (sorted.length === 1) return round(sorted[0])
  const rank = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  const weight = rank - lower
  return round(sorted[lower] * (1 - weight) + sorted[upper] * weight)
}

function buildComparisons(candidates) {
  const baseline = candidates.find((candidate) => candidate.key === 'baseline')
  const current = candidates.find((candidate) => candidate.key === 'current') ?? candidates[candidates.length - 1]
  if (!baseline || !current) {
    return []
  }

  const currentById = new Map(current.scenarios.map((scenario) => [scenario.id, scenario]))
  return baseline.scenarios.map((baselineScenario) => {
    const currentScenario = currentById.get(baselineScenario.id)
    return compareScenario(baselineScenario, currentScenario)
  })
}

function compareScenario(baselineScenario, currentScenario) {
  const baselineStats = baselineScenario?.stats
  const currentStats = currentScenario?.stats
  const baselinePassed = baselineScenario?.status === 'passed'
  const currentPassed = currentScenario?.status === 'passed'
  let classification = 'Inconclusive'
  let deltaMedianPct = null
  let deltaP95Pct = null
  const notes = [
    ...(baselineScenario?.notes ?? []).map((note) => `baseline: ${note}`),
    ...(currentScenario?.notes ?? []).map((note) => `current: ${note}`),
    ...(baselineScenario?.correctness ?? []).map((note) => `baseline correctness: ${note}`),
    ...(currentScenario?.correctness ?? []).map((note) => `current correctness: ${note}`),
  ]

  if (!baselinePassed && currentPassed) {
    classification = 'Correctness-only improvement'
  } else if (baselinePassed && !currentPassed) {
    classification = 'Regression'
  } else if (baselineStats && currentStats) {
    deltaMedianPct = percentChange(currentStats.median, baselineStats.median)
    deltaP95Pct = percentChange(currentStats.p95, baselineStats.p95)
    classification = classifyByThresholds(baselineStats, currentStats)
  }

  return {
    id: baselineScenario.id,
    area: baselineScenario.area,
    name: baselineScenario.name,
    metric: baselineScenario.metric,
    baseline: pickScenarioSummary(baselineScenario),
    current: pickScenarioSummary(currentScenario),
    deltaMedianPct,
    deltaP95Pct,
    classification,
    notes,
  }
}

function classifyByThresholds(baselineStats, currentStats) {
  const medianDelta = percentChange(currentStats.median, baselineStats.median)
  const p95Delta = percentChange(currentStats.p95, baselineStats.p95)
  if (medianDelta <= -10 && currentStats.p95 <= baselineStats.p95) {
    return 'Improved'
  }
  if (medianDelta > 10 || p95Delta > 10) {
    return 'Regression'
  }
  return 'Neutral'
}

function pickScenarioSummary(scenario) {
  if (!scenario) {
    return { status: 'missing', sampleCount: 0, stats: null }
  }
  return {
    status: scenario.status,
    sampleCount: scenario.sampleCount,
    stats: scenario.stats,
  }
}

function percentChange(current, baseline) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) {
    return null
  }
  return round(((current - baseline) / baseline) * 100)
}

function buildAreaRecommendations(comparisons) {
  const byArea = new Map()
  for (const comparison of comparisons) {
    if (!byArea.has(comparison.area)) {
      byArea.set(comparison.area, [])
    }
    byArea.get(comparison.area).push(comparison)
  }

  return [...byArea.entries()].map(([area, areaComparisons]) => {
    const regressions = areaComparisons.filter((comparison) => comparison.classification === 'Regression')
    const inconclusive = areaComparisons.filter((comparison) => comparison.classification === 'Inconclusive')
    const improved = areaComparisons.filter((comparison) => comparison.classification === 'Improved')
    const correctnessOnly = areaComparisons.filter((comparison) => comparison.classification === 'Correctness-only improvement')
    let recommendation = 'Accept: no runtime regression detected in this area.'
    if (regressions.length) {
      recommendation = `Investigate before release: ${regressions.length} regression(s) detected.`
    } else if (inconclusive.length) {
      recommendation = `Rerun or inspect manually: ${inconclusive.length} inconclusive scenario(s).`
    } else if (correctnessOnly.length && !regressions.length) {
      recommendation = 'Accept correctness improvement; latency comparison is not meaningful for failed baseline paths.'
    } else if (improved.length) {
      recommendation = 'Accept: measured scenarios are neutral or improved.'
    }
    return { area, recommendation, counts: countClassifications(areaComparisons) }
  })
}

function countClassifications(comparisons) {
  return comparisons.reduce((counts, comparison) => {
    counts[comparison.classification] = (counts[comparison.classification] ?? 0) + 1
    return counts
  }, {})
}

async function writeReports(report, reportDir) {
  await fs.mkdir(reportDir, { recursive: true })
  const jsonPath = path.join(reportDir, `${REPORT_SLUG}.json`)
  const mdPath = path.join(reportDir, `${REPORT_SLUG}.md`)
  const htmlPath = path.join(reportDir, `${REPORT_SLUG}.html`)

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
  await fs.writeFile(mdPath, renderMarkdownReport(report))
  await fs.writeFile(htmlPath, renderHtmlReport(report))

  return { jsonPath, mdPath, htmlPath }
}

function renderMarkdownReport(report) {
  const comparisons = report.comparisons ?? []
  const areas = [...new Set(comparisons.map((comparison) => comparison.area))]
  const lines = [
    `# Origin/Dev vs Current Frontend Runtime Performance`,
    '',
    `Generated: ${report.generatedAt}`,
    `Completed: ${report.completedAt ?? 'not completed'}`,
    '',
    `## Environment`,
    '',
    `- Base URL: \`${report.environment.baseUrl}\``,
    `- Browser: Chromium, one worker`,
    `- Baseline: \`${report.environment.baselineRef}\` (${report.environment.baselineCommit})`,
    `- Current: \`${report.environment.currentBranch}\` (${report.environment.currentCommit})`,
    `- Iterations: ${report.environment.routeWarmups} warmup + ${report.environment.routeIterations} measured for route/API/interaction; ${report.environment.mutationWarmups} warmup + ${report.environment.mutationIterations} measured for mutations`,
    `- Host: ${report.environment.hostname}, ${report.environment.platform}, Node ${report.environment.nodeVersion}`,
    `- Docker: ${report.environment.dockerVersion}`,
    '',
    `## Classification Rules`,
    '',
    `- Improved: current median at least 10% faster and p95 not worse.`,
    `- Neutral: current remains within the 10% regression threshold.`,
    `- Regression: current median or p95 is more than 10% slower, or baseline passes and current fails.`,
    `- Correctness-only improvement: baseline fails but current passes.`,
    '',
  ]

  for (const area of areas) {
    const rows = comparisons.filter((comparison) => comparison.area === area)
    const recommendation = report.areaRecommendations?.find((item) => item.area === area)?.recommendation ?? ''
    lines.push(`## ${area}`, '')
    lines.push(`Recommendation: ${recommendation}`, '')
    lines.push('| Scenario | Metric | Baseline median / p95 | Current median / p95 | Delta median | Delta p95 | Classification | Notes |')
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | --- |')
    for (const row of rows) {
      lines.push([
        escapeTable(row.name),
        escapeTable(row.metric),
        formatStatsPair(row.baseline.stats),
        formatStatsPair(row.current.stats),
        formatPercent(row.deltaMedianPct),
        formatPercent(row.deltaP95Pct),
        row.classification,
        escapeTable(row.notes.join('; ')),
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'))
    }
    lines.push('')
  }

  lines.push('## Candidate Notes', '')
  for (const candidate of report.candidates ?? []) {
    lines.push(`### ${candidate.label}`)
    lines.push(`- Ref: \`${candidate.ref}\``)
    lines.push(`- Commit: \`${candidate.commit || 'unknown'}\``)
    lines.push(`- Seed: \`${candidate.seed?.stamp ?? 'not seeded'}\``)
    if (candidate.notes?.length) {
      for (const note of candidate.notes) lines.push(`- Note: ${note}`)
    }
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

function renderHtmlReport(report) {
  const markdown = renderMarkdownReport(report)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Origin/Dev vs Current Frontend Runtime Performance</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; color: #111827; line-height: 1.5; }
    pre { white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; background: #f9fafb; }
  </style>
</head>
<body>
  <pre>${escapeHtml(markdown)}</pre>
</body>
</html>
`
}

function formatStatsPair(stats) {
  if (!stats) return 'n/a'
  return `${formatMs(stats.median)} / ${formatMs(stats.p95)}`
}

function formatMs(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)} ms` : 'n/a'
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return 'n/a'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function escapeTable(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSyntheticReport(options) {
  const baseline = {
    key: 'baseline',
    label: 'Baseline',
    ref: options.baselineRef,
    commit: 'baseline-synthetic',
    seed: { stamp: 'synthetic-baseline' },
    notes: [],
    scenarios: [
      syntheticScenario('public-route.home.primary-visible', 'Public cache/revalidation', 'Home warm load to primary content visible', 'time-to-primary-content-ms', [1000, 1100, 1200]),
      syntheticScenario('pagination.study.next', 'Study/Works pagination', 'Study Next click to page 2 grid visible', 'interaction-to-ready-ms', [500, 550, 600]),
      syntheticScenario('admin.blog-editor.open', 'Admin editor UX', 'Blog editor open to form ready', 'time-to-form-ready-ms', []),
      syntheticScenario('resume.browser-load', 'Resume PDF SSR', 'Resume browser load to shell', 'time-to-primary-content-ms', [], ['ReferenceError: DOMMatrix is not defined']),
    ],
  }
  const current = {
    key: 'current',
    label: 'Current',
    ref: options.currentRefName,
    commit: 'current-synthetic',
    seed: { stamp: 'synthetic-current' },
    notes: [],
    scenarios: [
      syntheticScenario('public-route.home.primary-visible', 'Public cache/revalidation', 'Home warm load to primary content visible', 'time-to-primary-content-ms', [800, 850, 900]),
      syntheticScenario('pagination.study.next', 'Study/Works pagination', 'Study Next click to page 2 grid visible', 'interaction-to-ready-ms', [620, 650, 700]),
      syntheticScenario('admin.blog-editor.open', 'Admin editor UX', 'Blog editor open to form ready', 'time-to-form-ready-ms', [400, 450, 500]),
      syntheticScenario('resume.browser-load', 'Resume PDF SSR', 'Resume browser load to shell', 'time-to-primary-content-ms', [300, 320, 340]),
    ],
  }
  const report = {
    slug: REPORT_SLUG,
    generatedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    environment: {
      baseUrl: options.baseUrl,
      baselineRef: options.baselineRef,
      baselineCommit: 'baseline-synthetic',
      currentBranch: 'synthetic-current',
      currentCommit: 'current-synthetic',
      nodeVersion: process.version,
      hostname: os.hostname(),
      platform: `${process.platform} ${process.arch}`,
      dockerVersion: 'synthetic',
      routeWarmups: options.pageWarmups,
      routeIterations: options.pageIterations,
      mutationWarmups: options.mutationWarmups,
      mutationIterations: options.mutationIterations,
    },
    candidates: [baseline, current],
  }
  report.comparisons = buildComparisons(report.candidates)
  report.areaRecommendations = buildAreaRecommendations(report.comparisons)
  report.reportPaths = {}
  return report
}

function syntheticScenario(id, area, name, metric, samples, notes = []) {
  return {
    id,
    area,
    name,
    metric,
    status: samples.length ? 'passed' : 'failed',
    sampleCount: samples.length,
    samples,
    stats: summarizeSamples(samples),
    notes,
    correctness: [],
    details: {},
  }
}

class HttpSession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl
    this.cookies = new Map()
  }

  async ensureAdminSession() {
    await this.request('/api/auth/test-login?email=admin@example.com&returnUrl=%2Fadmin%2Fdashboard', {
      method: 'GET',
      redirect: 'manual',
    })
    const session = await this.getJson('/api/auth/session')
    if (!session.authenticated) {
      throw new Error('Admin test login did not produce an authenticated session.')
    }
  }

  async getJson(pathname) {
    return await this.requestJson(pathname, { method: 'GET' })
  }

  async postJson(pathname, data) {
    return await this.requestJson(pathname, { method: 'POST', json: data, csrf: true })
  }

  async putJson(pathname, data) {
    return await this.requestJson(pathname, { method: 'PUT', json: data, csrf: true })
  }

  async requestJson(pathname, options = {}) {
    const response = await this.request(pathname, options)
    const body = await response.text()
    if (!response.ok) {
      throw new Error(`${options.method ?? 'GET'} ${pathname} failed with ${response.status}: ${body}`)
    }
    return body ? JSON.parse(body) : null
  }

  async request(pathname, options = {}) {
    const headers = new Headers(options.headers ?? {})
    if (options.csrf) {
      const csrf = await this.getJson('/api/auth/csrf')
      headers.set(csrf.headerName, csrf.requestToken)
    }
    if (this.cookies.size) {
      headers.set('cookie', [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; '))
    }
    if (options.json) {
      headers.set('content-type', 'application/json')
    }

    const response = await fetch(new URL(pathname, this.baseUrl), {
      method: options.method ?? 'GET',
      headers,
      body: options.json ? JSON.stringify(options.json) : options.body,
      redirect: options.redirect ?? 'follow',
    })
    this.storeCookies(response.headers)
    return response
  }

  storeCookies(headers) {
    const setCookies = typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : splitSetCookieHeader(headers.get('set-cookie'))
    for (const header of setCookies) {
      const [pair] = header.split(';')
      const separator = pair.indexOf('=')
      if (separator <= 0) continue
      this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim())
    }
  }
}

function splitSetCookieHeader(value) {
  if (!value) return []
  return value.split(/,(?=\s*[^;,=]+=[^;,]+)/g)
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => { stdout += chunk })
    child.stderr?.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => {
      if (options.allowFailure) resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` })
      else reject(error)
    })
    child.on('close', (code) => {
      if (code === 0 || options.allowFailure) {
        resolve({ code, stdout, stderr })
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with ${code}\n${stderr}`))
      }
    })
  })
}

async function captureCommand(command, args, options = {}) {
  const result = await runCommand(command, args, { ...options, capture: true })
  return result.stdout
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}

function stringifyError(error) {
  if (!error) return 'unknown error'
  if (error instanceof Error) return error.message
  return String(error)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
