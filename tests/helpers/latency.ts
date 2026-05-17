import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { TestInfo } from '@playwright/test'

export type LatencyMetricKind =
  | 'test'
  | 'navigation'
  | 'document-navigation'
  | 'api'
  | 'interaction'
  | 'step'

export type BudgetSeverity = 'warn' | 'hard'

export type LatencyBudget = {
  warnMs?: number
  hardMs?: number
  failOnHard?: boolean
  name?: string
}

export type ApiBudget = LatencyBudget & {
  method?: string
  urlPattern: string
}

export type TestBudget = LatencyBudget & {
  filePattern?: string
  titlePattern?: string
}

export type InteractionBudget = LatencyBudget & {
  namePattern?: string
  targetPattern?: string
  filePattern?: string
  titlePattern?: string
}

export type PerformanceBudgetConfig = {
  version: number
  defaults?: Partial<Record<'testDuration' | 'navigation' | 'api' | 'interaction', LatencyBudget>>
  steps?: Record<string, LatencyBudget>
  api?: ApiBudget[]
  tests?: TestBudget[]
  interactions?: InteractionBudget[]
}

export type BudgetContext = {
  kind: LatencyMetricKind
  name?: string
  method?: string
  url?: string
  file?: string
  title?: string
  target?: string
}

export type BudgetIssue = {
  severity: BudgetSeverity
  kind: LatencyMetricKind
  name: string
  durationMs: number
  warnMs?: number
  hardMs?: number
  failOnHard: boolean
  message: string
}

export type NavigationMetric = {
  url: string
  method: 'page.goto'
  durationMs: number
  startedAt: string
  status?: number
}

export type DocumentNavigationMetric = {
  name: string
  type: string
  durationMs: number
  domContentLoadedMs: number
  loadEventMs: number
  responseMs: number
}

export type ApiResponseMetric = {
  url: string
  method: string
  status?: number
  durationMs: number
  startedAt: string
  source: 'page' | 'request'
}

export type InteractionMetric = {
  name: string
  durationMs: number
  startTimeMs?: number
  interactionId?: number
  source: 'performance-observer' | 'raf'
  target?: string
}

export type MeasuredStepMetric = {
  name: string
  durationMs: number
  startedAt: string
  status: 'passed' | 'failed'
  budget?: LatencyBudget
  error?: string
}

export type E2ELatencyMetrics = {
  version: 1
  testId?: string
  title: string
  file: string
  projectName?: string
  status?: string
  expectedStatus?: string
  startedAt: string
  completedAt?: string
  testDurationMs?: number
  navigations: NavigationMetric[]
  documentNavigations: DocumentNavigationMetric[]
  apiResponses: ApiResponseMetric[]
  interactions: InteractionMetric[]
  measuredSteps: MeasuredStepMetric[]
  maxInteractionLatencyMs: number
  slowInteractions: InteractionMetric[]
  warnings: BudgetIssue[]
  budgetFailures: BudgetIssue[]
}

type MutableLatencyMetrics = E2ELatencyMetrics & {
  startTimeMs: number
  attached: boolean
}

const metricsByTestInfo = new WeakMap<TestInfo, MutableLatencyMetrics>()
let cachedBudgetConfig: PerformanceBudgetConfig | undefined

export function loadPerformanceBudgetConfig(): PerformanceBudgetConfig {
  if (!cachedBudgetConfig) {
    const budgetPath = path.resolve(process.cwd(), 'tests/performance-budgets.json')
    cachedBudgetConfig = JSON.parse(readFileSync(budgetPath, 'utf8')) as PerformanceBudgetConfig
  }

  return cachedBudgetConfig
}

export function resetPerformanceBudgetConfigForTests() {
  cachedBudgetConfig = undefined
}

export function startLatencyMetrics(testInfo: TestInfo) {
  const existing = metricsByTestInfo.get(testInfo)
  if (existing) {
    return existing
  }

  const metrics: MutableLatencyMetrics = {
    version: 1,
    testId: testInfo.testId,
    title: testInfo.title,
    file: normalizePath(testInfo.file),
    projectName: testInfo.project.name,
    expectedStatus: testInfo.expectedStatus,
    startedAt: new Date().toISOString(),
    startTimeMs: performance.now(),
    navigations: [],
    documentNavigations: [],
    apiResponses: [],
    interactions: [],
    measuredSteps: [],
    maxInteractionLatencyMs: 0,
    slowInteractions: [],
    warnings: [],
    budgetFailures: [],
    attached: false,
  }

  metricsByTestInfo.set(testInfo, metrics)
  return metrics
}

export function getLatencyMetrics(testInfo: TestInfo): E2ELatencyMetrics {
  return finalizeLatencyMetrics(testInfo)
}

export function recordNavigationMetric(testInfo: TestInfo, metric: NavigationMetric) {
  const metrics = startLatencyMetrics(testInfo)
  metrics.navigations.push(metric)
  recordBudgetEvaluation(metrics, 'navigation', 'page.goto', metric.durationMs)
}

export function recordDocumentNavigationMetrics(testInfo: TestInfo, metricsToRecord: DocumentNavigationMetric[]) {
  const metrics = startLatencyMetrics(testInfo)
  metrics.documentNavigations.push(...metricsToRecord)
}

export function recordApiResponseMetric(testInfo: TestInfo, metric: ApiResponseMetric) {
  const metrics = startLatencyMetrics(testInfo)
  metrics.apiResponses.push(metric)
  const budget = resolveLatencyBudget(loadPerformanceBudgetConfig(), {
    kind: 'api',
    method: metric.method,
    url: metric.url,
    name: metric.url,
    file: metrics.file,
    title: metrics.title,
  })
  recordBudgetEvaluation(metrics, 'api', `${metric.method} ${metric.url}`, metric.durationMs, budget)
}

export function recordInteractionMetrics(testInfo: TestInfo, interactions: InteractionMetric[]) {
  const metrics = startLatencyMetrics(testInfo)
  metrics.interactions.push(...interactions)

  const config = loadPerformanceBudgetConfig()
  const normalizedInteractions = normalizeInteractionsForBudget(interactions)
  for (const interaction of normalizedInteractions) {
    const budget = resolveLatencyBudget(config, {
      kind: 'interaction',
      name: interaction.name,
      file: metrics.file,
      title: metrics.title,
      target: interaction.target,
    })
    recordBudgetEvaluation(metrics, 'interaction', interaction.name, interaction.durationMs, budget)
  }
}

export function recordLatencyStep(testInfo: TestInfo, step: MeasuredStepMetric) {
  const metrics = startLatencyMetrics(testInfo)
  metrics.measuredSteps.push(step)

  if (step.budget) {
    recordBudgetEvaluation(metrics, 'step', step.name, step.durationMs, step.budget)
  }
}

export async function measureStep<T>(
  testInfo: TestInfo,
  name: string,
  budgetInput: string | LatencyBudget,
  action: () => Promise<T>,
  waitForReady?: (result: T) => Promise<unknown>,
): Promise<T> {
  const budget = typeof budgetInput === 'string'
    ? resolveNamedStepBudget(loadPerformanceBudgetConfig(), budgetInput)
    : budgetInput
  const startedAt = new Date().toISOString()
  const started = performance.now()
  let result: T | undefined
  let error: unknown

  try {
    result = await action()
    if (waitForReady) {
      await waitForReady(result)
    }
  } catch (caught) {
    error = caught
  }

  const durationMs = roundLatency(performance.now() - started)
  const step: MeasuredStepMetric = {
    name,
    durationMs,
    startedAt,
    status: error ? 'failed' : 'passed',
    budget,
    error: error ? stringifyError(error) : undefined,
  }
  recordLatencyStep(testInfo, step)

  if (error) {
    throw error
  }

  const issue = evaluateLatencyBudget('step', name, durationMs, budget)
  if (issue?.severity === 'hard' && issue.failOnHard) {
    throw new Error(issue.message)
  }

  return result as T
}

export async function attachLatencyMetrics(testInfo: TestInfo) {
  const metrics = finalizeLatencyMetrics(testInfo)
  const mutableMetrics = metricsByTestInfo.get(testInfo)
  if (mutableMetrics?.attached) {
    return
  }

  if (mutableMetrics) {
    mutableMetrics.attached = true
  }

  const metricsJson = `${JSON.stringify(metrics, null, 2)}\n`
  const attachmentPath = testInfo.outputPath('e2e-latency.json')
  await writeFile(attachmentPath, metricsJson, 'utf8')
  await testInfo.attach('e2e-latency.json', {
    contentType: 'application/json',
    path: attachmentPath,
  })

  const enforcedFailures = metrics.budgetFailures.filter((issue) => issue.failOnHard)
  if (enforcedFailures.length > 0 && testInfo.status === testInfo.expectedStatus) {
    throw new Error(formatBudgetFailures(enforcedFailures))
  }
}

export function finalizeLatencyMetrics(testInfo: TestInfo): E2ELatencyMetrics {
  const metrics = startLatencyMetrics(testInfo)
  metrics.completedAt = new Date().toISOString()
  metrics.status = testInfo.status
  metrics.expectedStatus = testInfo.expectedStatus
  metrics.testDurationMs = roundLatency(performance.now() - metrics.startTimeMs)

  metrics.maxInteractionLatencyMs = roundLatency(
    metrics.interactions.reduce((max, interaction) => Math.max(max, interaction.durationMs), 0),
  )

  const interactionWarnMs = loadPerformanceBudgetConfig().defaults?.interaction?.warnMs ?? 150
  metrics.slowInteractions = [...metrics.interactions]
    .filter((interaction) => interaction.durationMs >= interactionWarnMs)
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 20)

  const testBudget = resolveLatencyBudget(loadPerformanceBudgetConfig(), {
    kind: 'test',
    name: metrics.title,
    file: metrics.file,
    title: metrics.title,
  })
  recordBudgetEvaluation(metrics, 'test', metrics.title, metrics.testDurationMs, testBudget)

  return stripMutableFields(metrics)
}

export function resolveNamedStepBudget(config: PerformanceBudgetConfig, name: string): LatencyBudget {
  const budget = config.steps?.[name]
  if (!budget) {
    throw new Error(`Unknown E2E latency budget "${name}"`)
  }

  return { ...budget, name }
}

export function resolveLatencyBudget(
  config: PerformanceBudgetConfig,
  context: BudgetContext,
): LatencyBudget | undefined {
  if (context.kind === 'step' && context.name && config.steps?.[context.name]) {
    return { ...config.steps[context.name], name: context.name }
  }

  if (context.kind === 'api' && context.url) {
    const apiPath = toPathname(context.url)
    const match = config.api?.find((budget) => {
      const methodMatches = !budget.method || budget.method.toUpperCase() === context.method?.toUpperCase()
      return methodMatches && globMatches(budget.urlPattern, apiPath)
    })

    if (match) {
      return { ...match, name: match.name ?? `${context.method ?? 'REQUEST'} ${match.urlPattern}` }
    }

    return config.defaults?.api
  }

  if (context.kind === 'test') {
    const normalizedFile = normalizePath(context.file ?? '')
    const match = config.tests?.find((budget) => {
      const fileMatches = !budget.filePattern || globMatches(budget.filePattern, normalizedFile)
      const titleMatches = !budget.titlePattern || globMatches(budget.titlePattern, context.title ?? '')
      return fileMatches && titleMatches
    })

    if (match) {
      return { ...match, name: match.name ?? match.filePattern ?? match.titlePattern }
    }

    return config.defaults?.testDuration
  }

  if (context.kind === 'navigation') {
    return config.defaults?.navigation
  }

  if (context.kind === 'interaction') {
    const normalizedFile = normalizePath(context.file ?? '')
    const normalizedTarget = normalizeTargetForBudget(context.target)
    const match = config.interactions?.find((budget) => {
      const nameMatches = !budget.namePattern || globMatches(budget.namePattern, context.name ?? '')
      const targetMatches = !budget.targetPattern || globMatches(budget.targetPattern, normalizedTarget)
      const fileMatches = !budget.filePattern || globMatches(budget.filePattern, normalizedFile)
      const titleMatches = !budget.titlePattern || globMatches(budget.titlePattern, context.title ?? '')
      return nameMatches && targetMatches && fileMatches && titleMatches
    })

    if (match) {
      return {
        ...match,
        name: match.name ?? match.namePattern ?? match.targetPattern ?? match.filePattern ?? match.titlePattern,
      }
    }

    return config.defaults?.interaction
  }

  return undefined
}

export function evaluateLatencyBudget(
  kind: LatencyMetricKind,
  name: string,
  durationMs: number,
  budget?: LatencyBudget,
): BudgetIssue | undefined {
  if (!budget) {
    return undefined
  }

  const failOnHard = budget.failOnHard ?? false
  if (budget.hardMs !== undefined && durationMs > budget.hardMs) {
    return {
      severity: 'hard',
      kind,
      name,
      durationMs,
      warnMs: budget.warnMs,
      hardMs: budget.hardMs,
      failOnHard,
      message: `${kind} "${name}" took ${durationMs}ms, exceeding hard budget ${budget.hardMs}ms`,
    }
  }

  if (budget.warnMs !== undefined && durationMs > budget.warnMs) {
    return {
      severity: 'warn',
      kind,
      name,
      durationMs,
      warnMs: budget.warnMs,
      hardMs: budget.hardMs,
      failOnHard: false,
      message: `${kind} "${name}" took ${durationMs}ms, exceeding warn budget ${budget.warnMs}ms`,
    }
  }

  return undefined
}

export function roundLatency(value: number) {
  return Math.round(value * 100) / 100
}

export function isTrackedApiUrl(url: string) {
  const pathname = toPathname(url)
  return pathname.startsWith('/api/') || pathname === '/revalidate-public'
}

type InteractionFamily =
  | 'click'
  | 'keyboard'
  | 'input'
  | 'hover-enter'
  | 'hover-leave'
  | 'other'

type InteractionWithMeta = InteractionMetric & {
  _family: InteractionFamily
  _canonicalName: string
  _normalizedTarget: string
  _normalizedStartMs: number
  _index: number
}

type InteractionCluster = {
  family: InteractionFamily
  canonicalName: string
  normalizedTarget: string
  firstIndex: number
  endTimeMs: number
  members: InteractionWithMeta[]
}

const INTERACTION_CLUSTER_GAP_MS: Record<InteractionFamily, number> = {
  click: 140,
  keyboard: 30,
  input: 30,
  'hover-enter': 120,
  'hover-leave': 120,
  other: 80,
}

const INTERACTION_SOURCE_PRIORITY: Record<InteractionMetric['source'], number> = {
  'performance-observer': 2,
  raf: 1,
}

export function normalizeInteractionsForBudget(interactions: InteractionMetric[]): InteractionMetric[] {
  if (interactions.length === 0) {
    return []
  }

  const enriched = interactions
    .map((interaction, index) => {
      const lowerName = interaction.name.toLowerCase()
      const family = inferInteractionFamily(lowerName)
      return {
        ...interaction,
        _family: family,
        _canonicalName: toCanonicalInteractionName(family, lowerName),
        _normalizedTarget: normalizeTargetForBudget(interaction.target),
        _normalizedStartMs: Number.isFinite(interaction.startTimeMs)
          ? Number(interaction.startTimeMs)
          : index * 1000,
        _index: index,
      } satisfies InteractionWithMeta
    })
    .sort((left, right) => {
      if (left._normalizedStartMs !== right._normalizedStartMs) {
        return left._normalizedStartMs - right._normalizedStartMs
      }
      return left._index - right._index
    })

  const clusters: InteractionCluster[] = []
  const groupedByInteractionId = new Map<string, InteractionCluster>()
  const trailingByGroup = new Map<string, InteractionCluster>()

  for (const interaction of enriched) {
    const interactionIdKey = toInteractionIdKey(interaction)
    if (interactionIdKey) {
      const key = `${interactionIdKey}:${interaction._family}:${interaction._normalizedTarget}`
      let cluster = groupedByInteractionId.get(key)
      if (!cluster) {
        cluster = createCluster(interaction)
        groupedByInteractionId.set(key, cluster)
        clusters.push(cluster)
      } else {
        appendCluster(cluster, interaction)
      }
      continue
    }

    const groupKey = `${interaction._family}:${interaction._normalizedTarget}`
    const trailingCluster = trailingByGroup.get(groupKey)
    const clusterGapMs = INTERACTION_CLUSTER_GAP_MS[interaction._family]
    if (
      trailingCluster
      && interaction._normalizedStartMs - trailingCluster.endTimeMs <= clusterGapMs
    ) {
      appendCluster(trailingCluster, interaction)
      continue
    }

    const cluster = createCluster(interaction)
    trailingByGroup.set(groupKey, cluster)
    clusters.push(cluster)
  }

  return clusters
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map((cluster) => toRepresentativeInteraction(cluster))
}

function recordBudgetEvaluation(
  metrics: MutableLatencyMetrics,
  kind: LatencyMetricKind,
  name: string,
  durationMs: number,
  budget?: LatencyBudget,
) {
  const issue = evaluateLatencyBudget(kind, name, durationMs, budget)
  if (!issue) {
    return
  }

  if (issue.severity === 'hard' && issue.failOnHard) {
    if (!metrics.budgetFailures.some((existing) => sameBudgetIssue(existing, issue))) {
      metrics.budgetFailures.push(issue)
    }
    return
  }

  if (!metrics.warnings.some((existing) => sameBudgetIssue(existing, issue))) {
    metrics.warnings.push(issue)
  }
}

function sameBudgetIssue(left: BudgetIssue, right: BudgetIssue) {
  return left.kind === right.kind
    && left.name === right.name
    && left.durationMs === right.durationMs
    && left.severity === right.severity
}

function stripMutableFields(metrics: MutableLatencyMetrics): E2ELatencyMetrics {
  const publicMetrics: Partial<MutableLatencyMetrics> = { ...metrics }
  delete publicMetrics.startTimeMs
  delete publicMetrics.attached
  return publicMetrics as E2ELatencyMetrics
}

function formatBudgetFailures(failures: BudgetIssue[]) {
  const details = failures
    .slice(0, 5)
    .map((failure) => `- ${failure.message}`)
    .join('\n')
  const suffix = failures.length > 5 ? `\n- ${failures.length - 5} additional budget failure(s)` : ''
  return `E2E latency budget failure(s):\n${details}${suffix}`
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function normalizePath(value: string) {
  return value.replaceAll('\\', '/')
}

function normalizeTargetForBudget(value?: string) {
  return (value ?? '[unknown]').trim().toLowerCase()
}

function toPathname(url: string) {
  try {
    return new URL(url, 'http://local.test').pathname
  } catch {
    return url
  }
}

function globMatches(pattern: string, value: string) {
  return globToRegExp(pattern).test(normalizePath(value))
}

function inferInteractionFamily(name: string): InteractionFamily {
  if (name === 'click' || name === 'pointerdown' || name === 'mousedown' || name === 'pointerup' || name === 'mouseup') {
    return 'click'
  }

  if (name === 'keydown' || name === 'keypress') {
    return 'keyboard'
  }

  if (name === 'input' || name === 'beforeinput') {
    return 'input'
  }

  if (name === 'pointerover' || name === 'pointerenter' || name === 'mouseover') {
    return 'hover-enter'
  }

  if (name === 'pointerout' || name === 'pointerleave' || name === 'mouseout') {
    return 'hover-leave'
  }

  return 'other'
}

function toCanonicalInteractionName(family: InteractionFamily, fallbackName: string) {
  if (family === 'click') {
    return 'click'
  }

  if (family === 'keyboard') {
    return 'keydown'
  }

  if (family === 'input') {
    return 'input'
  }

  if (family === 'hover-enter') {
    return 'hover-enter'
  }

  if (family === 'hover-leave') {
    return 'hover-leave'
  }

  return fallbackName
}

function toInteractionIdKey(interaction: InteractionWithMeta) {
  if (!Number.isFinite(interaction.interactionId)) {
    return undefined
  }

  const numericId = Number(interaction.interactionId)
  if (numericId <= 0) {
    return undefined
  }

  return `iid:${numericId}`
}

function createCluster(interaction: InteractionWithMeta): InteractionCluster {
  return {
    family: interaction._family,
    canonicalName: interaction._canonicalName,
    normalizedTarget: interaction._normalizedTarget,
    firstIndex: interaction._index,
    endTimeMs: interaction._normalizedStartMs,
    members: [interaction],
  }
}

function appendCluster(cluster: InteractionCluster, interaction: InteractionWithMeta) {
  cluster.members.push(interaction)
  cluster.endTimeMs = Math.max(cluster.endTimeMs, interaction._normalizedStartMs)
}

function toRepresentativeInteraction(cluster: InteractionCluster): InteractionMetric {
  const representative = cluster.members.reduce((best, candidate) => {
    if (candidate.durationMs !== best.durationMs) {
      return candidate.durationMs > best.durationMs ? candidate : best
    }

    const sourcePriorityDelta = INTERACTION_SOURCE_PRIORITY[candidate.source] - INTERACTION_SOURCE_PRIORITY[best.source]
    if (sourcePriorityDelta !== 0) {
      return sourcePriorityDelta > 0 ? candidate : best
    }

    return candidate._index < best._index ? candidate : best
  })

  return {
    ...stripInteractionMeta(representative),
    name: cluster.canonicalName,
  }
}

function stripInteractionMeta(interaction: InteractionWithMeta): InteractionMetric {
  const publicInteraction: Partial<InteractionWithMeta> = { ...interaction }
  delete publicInteraction._family
  delete publicInteraction._canonicalName
  delete publicInteraction._normalizedTarget
  delete publicInteraction._normalizedStartMs
  delete publicInteraction._index
  return publicInteraction as InteractionMetric
}

function globToRegExp(pattern: string) {
  let source = '^'
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]
    const next = pattern[index + 1]

    if (char === '*') {
      if (next === '*') {
        source += '.*'
        index += 1
      } else {
        source += '[^/]*'
      }
      continue
    }

    if (char === '?') {
      source += '[^/]'
      continue
    }

    if (char === '{') {
      const closeIndex = pattern.indexOf('}', index)
      if (closeIndex > index) {
        const choices = pattern
          .slice(index + 1, closeIndex)
          .split(',')
          .map(escapeRegExp)
          .join('|')
        source += `(?:${choices})`
        index = closeIndex
        continue
      }
    }

    source += escapeRegExp(char)
  }

  source += '$'
  return new RegExp(source)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
