import { defineConfig, devices } from '@playwright/test'

const AUTHENTICATED_SPECS = [
  /tests\/admin-(?!redirect).*\.spec\.ts$/,
  /tests\/dark-mode\.spec\.ts$/,
  /tests\/e2e-admin-.*\.spec\.ts$/,
  /tests\/feature-recording-0418\.spec\.ts$/,
  /tests\/live-.*\.spec\.ts$/,
  /tests\/manual-qa-gap-coverage\.spec\.ts$/,
  /tests\/mermaid-batch-prompt-0419\.spec\.ts$/,
  /tests\/mermaid-worstcase-0419\.spec\.ts$/,
  /tests\/plain-baseline-0419\.spec\.ts$/,
  /tests\/public-blog-inline-redirects\.spec\.ts$/,
  /tests\/public-footer-social\.spec\.ts$/,
  /tests\/ui-admin-.*\.spec\.ts$/,
  /tests\/public-page-inline-save\.spec\.ts$/,
  /tests\/public-inline-editors\.spec\.ts$/,
  /tests\/public-inline-editors-unsaved-warning\.spec\.ts$/,
  /tests\/public-blog-detail-inline-edit\.spec\.ts$/,
  /tests\/public-work-detail-inline-edit\.spec\.ts$/,
  /tests\/public-work-videos\.spec\.ts$/,
  /tests\/renovation-0416-regression\.spec\.ts$/,
  /tests\/regression-screenshot-capture\.spec\.ts$/,
  /tests\/resume\.spec\.ts$/,
  /tests\/ui-loading-states\.spec\.ts$/,
  /tests\/ui-quality-.*\.spec\.ts$/,
  /tests\/work-green-video-thumbnail\.spec\.ts$/,
  /tests\/work-inline-create-flow\.spec\.ts$/,
  /tests\/work-inline-redirects\.spec\.ts$/,
  /tests\/work-single-delete-ux\.spec\.ts$/,
]

const RUNTIME_AUTH_SPECS = [
  /tests\/auth-security-browser\.spec\.ts$/,
  /tests\/public-admin-affordances\.spec\.ts$/,
  /tests\/ui-header-overlays\.spec\.ts$/,
  /tests\/test-server-runtime\.spec\.ts$/,
]

const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:13000'
const IGNORE_LOCALHOST_HTTPS_ERRORS = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
  PLAYWRIGHT_BASE_URL,
)

const desktop = devices['Desktop Chrome']
const tablet = {
  ...devices['Desktop Chrome'],
  viewport: { width: 820, height: 1180 },
}
const mobile = devices['Pixel 7']

function publicProject(name: string, use: typeof desktop) {
  return {
    name: `test260419-public-${name}`,
    use,
    testIgnore: [...AUTHENTICATED_SPECS, ...RUNTIME_AUTH_SPECS],
  }
}

function adminProject(name: string, use: typeof desktop) {
  return {
    name: `test260419-admin-${name}`,
    use: {
      ...use,
      storageState: 'test-results/playwright/admin-storage-state.json',
    },
    testMatch: AUTHENTICATED_SPECS,
  }
}

function runtimeAuthProject(name: string, use: typeof desktop) {
  return {
    name: `test260419-runtime-auth-${name}`,
    use,
    testMatch: RUNTIME_AUTH_SPECS,
  }
}

export default defineConfig({
  testDir: './tests',
  outputDir: 'tests/playwright/test260419',
  timeout: 30_000,
  globalSetup: './tests/helpers/global-setup.ts',
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    headless: process.env.PLAYWRIGHT_HEADED === '1' ? false : undefined,
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: IGNORE_LOCALHOST_HTTPS_ERRORS,
    screenshot: 'on',
    video: 'on',
  },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER === '1'
    ? undefined
    : {
        command: 'npm run dev',
        env: {
          ...process.env,
          DEV_PROXY_ORIGIN: 'http://localhost:8080',
          INTERNAL_API_ORIGIN: 'http://localhost:8080',
          NEXT_PUBLIC_API_BASE_URL: '/api',
          NEXT_DIST_DIR: '.next-playwright',
          NODE_TLS_REJECT_UNAUTHORIZED: '0',
        },
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    publicProject('desktop', desktop),
    publicProject('tablet', tablet),
    publicProject('mobile', mobile),
    adminProject('desktop', desktop),
    adminProject('tablet', tablet),
    adminProject('mobile', mobile),
    runtimeAuthProject('desktop', desktop),
    runtimeAuthProject('tablet', tablet),
    runtimeAuthProject('mobile', mobile),
  ],
})
