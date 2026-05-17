import { defineConfig, devices } from '@playwright/test'

const AUTHENTICATED_SPECS = [
  /tests\/admin-(?!(?:redirect|auth-authorization)\.spec\.ts$).*\.spec\.ts$/,
  /tests\/dark-mode\.spec\.ts$/,
  /tests\/e2e-admin-.*\.spec\.ts$/,
  /tests\/live-.*\.spec\.ts$/,
  /tests\/manual-qa-gap-coverage\.spec\.ts$/,
  /tests\/public-footer-social\.spec\.ts$/,
  /tests\/ui-admin-.*\.spec\.ts$/,
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
  /tests\/admin-auth-authorization\.spec\.ts$/,
  /tests\/auth-security-browser\.spec\.ts$/,
  /tests\/public-admin-affordances\.spec\.ts$/,
  /tests\/ui-header-overlays\.spec\.ts$/,
  /tests\/test-server-runtime\.spec\.ts$/,
]

const OPTIONAL_E2E_SPECS = [
  /tests\/admin-ai-batch-cancel\.spec\.ts$/,
  /tests\/admin-ai-batch-jobs\.spec\.ts$/,
  /tests\/admin-regression-flow-captures\.spec\.ts$/,
  /tests\/admin-regression-screenshot-capture\.spec\.ts$/,
  /tests\/e2e-admin-batch-management-journey\.spec\.ts$/,
  /tests\/feature-recording-0418\.spec\.ts$/,
  /tests\/live-blog-ai-regressions\.spec\.ts$/,
  /tests\/manual-auth\.spec\.ts$/,
  /tests\/manual-qa-auth-gap\.spec\.ts$/,
  /tests\/manual-qa-gap-coverage\.spec\.ts$/,
  /tests\/mermaid-batch-prompt-0419\.spec\.ts$/,
  /tests\/mermaid-worstcase-0419\.spec\.ts$/,
  /tests\/plain-baseline-0419\.spec\.ts$/,
  /tests\/regression-screenshot-capture\.spec\.ts$/,
  /tests\/renovation-0416-regression\.spec\.ts$/,
  /tests\/responsive-width-sweep\.spec\.ts$/,
  /tests\/video-preview-recording-0424\.spec\.ts$/,
]

const OPTIONAL_AUTHENTICATED_SPECS = [
  /tests\/admin-ai-batch-cancel\.spec\.ts$/,
  /tests\/admin-ai-batch-jobs\.spec\.ts$/,
  /tests\/admin-regression-flow-captures\.spec\.ts$/,
  /tests\/admin-regression-screenshot-capture\.spec\.ts$/,
  /tests\/e2e-admin-batch-management-journey\.spec\.ts$/,
  /tests\/feature-recording-0418\.spec\.ts$/,
  /tests\/live-blog-ai-regressions\.spec\.ts$/,
  /tests\/manual-qa-gap-coverage\.spec\.ts$/,
  /tests\/mermaid-batch-prompt-0419\.spec\.ts$/,
  /tests\/mermaid-worstcase-0419\.spec\.ts$/,
  /tests\/plain-baseline-0419\.spec\.ts$/,
  /tests\/regression-screenshot-capture\.spec\.ts$/,
  /tests\/renovation-0416-regression\.spec\.ts$/,
  /tests\/video-preview-recording-0424\.spec\.ts$/,
]

const OPTIONAL_RUNTIME_AUTH_SPECS = [
  /tests\/manual-auth\.spec\.ts$/,
  /tests\/manual-qa-auth-gap\.spec\.ts$/,
]

const OPTIONAL_PUBLIC_SPECS = [
  /tests\/responsive-width-sweep\.spec\.ts$/,
]

const E2E_PROFILE = process.env.PLAYWRIGHT_E2E_PROFILE ?? 'core'
const RUN_OPTIONAL_ONLY = E2E_PROFILE === 'optional'
const RUN_EXHAUSTIVE = E2E_PROFILE === 'exhaustive'
const EXPLICITLY_REQUESTS_OPTIONAL_SPEC = process.argv
  .map((arg) => arg.replace(/\\/g, '/'))
  .some((arg) => OPTIONAL_E2E_SPECS.some((pattern) => pattern.test(arg)))
const CORE_OPTIONAL_IGNORES = RUN_EXHAUSTIVE || RUN_OPTIONAL_ONLY || EXPLICITLY_REQUESTS_OPTIONAL_SPEC ? [] : OPTIONAL_E2E_SPECS

const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const IGNORE_LOCALHOST_HTTPS_ERRORS = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
  PLAYWRIGHT_BASE_URL,
)

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/playwright',
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
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'chromium-public',
      use: { ...devices['Desktop Chrome'] },
      testMatch: RUN_OPTIONAL_ONLY ? OPTIONAL_PUBLIC_SPECS : undefined,
      testIgnore: RUN_OPTIONAL_ONLY ? [] : [...AUTHENTICATED_SPECS, ...RUNTIME_AUTH_SPECS, ...CORE_OPTIONAL_IGNORES],
    },
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'test-results/playwright/admin-storage-state.json',
      },
      testMatch: RUN_OPTIONAL_ONLY ? OPTIONAL_AUTHENTICATED_SPECS : AUTHENTICATED_SPECS,
      testIgnore: CORE_OPTIONAL_IGNORES,
    },
    {
      name: 'chromium-runtime-auth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: RUN_OPTIONAL_ONLY ? OPTIONAL_RUNTIME_AUTH_SPECS : RUNTIME_AUTH_SPECS,
      testIgnore: CORE_OPTIONAL_IGNORES,
    },
  ],
})
