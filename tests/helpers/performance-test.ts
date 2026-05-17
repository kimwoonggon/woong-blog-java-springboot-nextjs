import { expect, test as base } from '@playwright/test'
import type { APIRequestContext, APIResponse, Page, Request, Response, TestInfo } from '@playwright/test'
import {
  attachLatencyMetrics,
  isTrackedApiUrl,
  recordApiResponseMetric,
  recordDocumentNavigationMetrics,
  recordInteractionMetrics,
  recordNavigationMetric,
  roundLatency,
  startLatencyMetrics,
  type DocumentNavigationMetric,
  type InteractionMetric,
} from './latency'
import { ensureAdminSession } from './auth'

type PerformanceFixtures = {
  e2eLatencyMetrics: void
}

export const test = base.extend<PerformanceFixtures>({
  e2eLatencyMetrics: [async ({}, runFixture, testInfo) => {
    startLatencyMetrics(testInfo)
    await runFixture()
    await attachLatencyMetrics(testInfo)
  }, { auto: true }],

  page: async ({ page }, runPage, testInfo) => {
    if (shouldRefreshAdminSession(testInfo)) {
      await ensureAdminSession(page)
    }

    await installBrowserLatencyObserver(page)
    instrumentPageGoto(page, testInfo)
    instrumentPageApiResponses(page, testInfo)

    try {
      await runPage(page)
    } finally {
      await collectPageLatencyMetrics(page, testInfo)
      await attachLatencyMetrics(testInfo)
    }
  },

  request: async ({ request }, runRequest, testInfo) => {
    await runRequest(createInstrumentedApiRequestContext(request, testInfo))
  },
})

export { expect }
export {
  request,
  devices,
  chromium,
  firefox,
  webkit,
  type APIRequestContext,
  type APIResponse,
  type Browser,
  type BrowserContext,
  type FullConfig,
  type Locator,
  type Page,
  type Request,
  type Response,
  type TestInfo,
} from '@playwright/test'

function shouldRefreshAdminSession(testInfo: TestInfo) {
  if (testInfo.project.name !== 'chromium-authenticated') {
    return false
  }

  return !/tests\/admin-auth-authorization\.spec\.ts$/.test(testInfo.file.replace(/\\/g, '/'))
}

function instrumentPageGoto(page: Page, testInfo: TestInfo) {
  const originalGoto = page.goto.bind(page)
  const instrumentedGoto: Page['goto'] = async (...args) => {
    const startedAt = new Date().toISOString()
    const started = performance.now()
    const response = await originalGoto(...args)
    recordNavigationMetric(testInfo, {
      url: String(args[0]),
      method: 'page.goto',
      durationMs: roundLatency(performance.now() - started),
      startedAt,
      status: response?.status(),
    })
    return response
  }

  page.goto = instrumentedGoto
}

function instrumentPageApiResponses(page: Page, testInfo: TestInfo) {
  const requestStarts = new WeakMap<Request, { startedAt: string, startTimeMs: number }>()

  page.on('request', (request) => {
    if (!isTrackedApiUrl(request.url())) {
      return
    }

    requestStarts.set(request, {
      startedAt: new Date().toISOString(),
      startTimeMs: performance.now(),
    })
  })

  page.on('response', (response) => {
    recordPageResponse(testInfo, response, requestStarts)
  })

  page.on('requestfailed', (request) => {
    const started = requestStarts.get(request)
    if (!started) {
      return
    }

    recordApiResponseMetric(testInfo, {
      url: request.url(),
      method: request.method(),
      durationMs: roundLatency(performance.now() - started.startTimeMs),
      startedAt: started.startedAt,
      source: 'page',
    })
  })
}

function recordPageResponse(
  testInfo: TestInfo,
  response: Response,
  requestStarts: WeakMap<Request, { startedAt: string, startTimeMs: number }>,
) {
  const request = response.request()
  const started = requestStarts.get(request)
  if (!started) {
    return
  }

  recordApiResponseMetric(testInfo, {
    url: response.url(),
    method: request.method(),
    status: response.status(),
    durationMs: roundLatency(performance.now() - started.startTimeMs),
    startedAt: started.startedAt,
    source: 'page',
  })
}

function createInstrumentedApiRequestContext(request: APIRequestContext, testInfo: TestInfo) {
  const methodNames = ['delete', 'fetch', 'get', 'head', 'patch', 'post', 'put'] as const
  const methodNameSet = new Set<string>(methodNames)

  return new Proxy(request, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver)
      if (typeof property !== 'string' || !methodNameSet.has(property) || typeof value !== 'function') {
        return typeof value === 'function' ? value.bind(target) : value
      }

      return async (...args: unknown[]) => {
        const original = value.bind(target) as (...methodArgs: unknown[]) => Promise<APIResponse>
        const url = String(args[0])
        if (!isTrackedApiUrl(url)) {
          return original(...args)
        }

        const startedAt = new Date().toISOString()
        const started = performance.now()
        const response = await original(...args)
        recordApiResponseMetric(testInfo, {
          url: response.url(),
          method: inferApiRequestMethod(property, args[1]),
          status: response.status(),
          durationMs: roundLatency(performance.now() - started),
          startedAt,
          source: 'request',
        })
        return response
      }
    },
  }) as APIRequestContext
}

function inferApiRequestMethod(methodName: string, options: unknown) {
  if (methodName === 'fetch' && options && typeof options === 'object' && 'method' in options) {
    const method = (options as { method?: unknown }).method
    if (typeof method === 'string') {
      return method.toUpperCase()
    }
  }

  return methodName.toUpperCase()
}

async function installBrowserLatencyObserver(page: Page) {
  await page.addInitScript(() => {
    type BrowserLatencyStore = {
      interactions: Array<{
        name: string
        durationMs: number
        startTimeMs?: number
        interactionId?: number
        source: 'performance-observer' | 'raf'
        target?: string
      }>
    }

    const win = window as typeof window & { __e2eLatency?: BrowserLatencyStore }
    if (win.__e2eLatency) {
      return
    }

    const store: BrowserLatencyStore = { interactions: [] }
    win.__e2eLatency = store

    const describeTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return undefined
      }

      const testId = target.getAttribute('data-testid')
      if (testId) {
        return `[data-testid="${testId}"]`
      }

      const ariaLabel = target.getAttribute('aria-label')
      if (ariaLabel) {
        return `${target.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`
      }

      return target.tagName.toLowerCase()
    }

    const pushInteraction = (interaction: BrowserLatencyStore['interactions'][number]) => {
      store.interactions.push(interaction)
      if (store.interactions.length > 250) {
        store.interactions.splice(0, store.interactions.length - 250)
      }
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const eventEntry = entry as PerformanceEntry & {
            duration?: number
            interactionId?: number
            target?: EventTarget
          }
          const duration = Number(eventEntry.duration ?? 0)
          if (!Number.isFinite(duration) || duration <= 0) {
            continue
          }

          pushInteraction({
            name: eventEntry.name,
            durationMs: Math.round(duration * 100) / 100,
            startTimeMs: Math.round(eventEntry.startTime * 100) / 100,
            interactionId: eventEntry.interactionId,
            source: 'performance-observer',
            target: describeTarget(eventEntry.target ?? null),
          })
        }
      })
      observer.observe({
        type: 'event',
        buffered: true,
        durationThreshold: 0,
      } as PerformanceObserverInit & { durationThreshold: number })
    } catch {
      // Event Timing is not available in every browser/project; RAF fallback below still records interactions.
    }

    const trackedEvents = ['click', 'keydown']
    for (const eventName of trackedEvents) {
      window.addEventListener(eventName, (event) => {
        const started = performance.now()
        requestAnimationFrame(() => {
          pushInteraction({
            name: eventName,
            durationMs: Math.round((performance.now() - started) * 100) / 100,
            startTimeMs: Math.round(started * 100) / 100,
            source: 'raf',
            target: describeTarget(event.target),
          })
        })
      }, { capture: true, passive: true })
    }
  })
}

async function collectPageLatencyMetrics(page: Page, testInfo: TestInfo) {
  if (page.isClosed()) {
    return
  }

  const browserMetrics = await page.evaluate(() => {
    const win = window as typeof window & {
      __e2eLatency?: { interactions: InteractionMetric[] }
    }
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const documentNavigations: DocumentNavigationMetric[] = navigationEntries.map((entry) => ({
      name: entry.name,
      type: entry.type,
      durationMs: Math.round(entry.duration * 100) / 100,
      domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd * 100) / 100,
      loadEventMs: Math.round(entry.loadEventEnd * 100) / 100,
      responseMs: Math.round((entry.responseEnd - entry.requestStart) * 100) / 100,
    }))

    return {
      interactions: win.__e2eLatency?.interactions ?? [],
      documentNavigations,
    }
  }).catch(() => ({ interactions: [], documentNavigations: [] }))

  recordInteractionMetrics(testInfo, browserMetrics.interactions)
  recordDocumentNavigationMetrics(testInfo, browserMetrics.documentNavigations)
}
