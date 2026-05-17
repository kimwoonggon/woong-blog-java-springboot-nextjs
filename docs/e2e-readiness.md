# E2E Readiness

Use this quick check before running full Playwright suites:

```bash
npm run test:e2e:readiness
```

It verifies:

- Docker is reachable from the current shell.
- The backend health URL responds.
- The Playwright frontend base URL responds.

Default URLs:

- Backend: `http://127.0.0.1:8080/api/health`
- Frontend: `http://127.0.0.1:3000`

For the documented alternate backend port:

```bash
BACKEND_PUBLISH_PORT=18080 ./scripts/dev-up.sh
BACKEND_PUBLISH_PORT=18080 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e:readiness
```

If every check passes, run focused e2e:

```bash
PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- <focused specs>
```

If Docker reports that it is unavailable in WSL, enable Docker Desktop WSL integration for this distro before starting the dev stack.

## Vitest Stability

The default `npm test` command uses the `threads` pool with bounded workers (`--maxWorkers=2`). This avoids intermittent full-suite worker startup timeouts seen when the full suite starts too many jsdom/editor/Pact workers under WSL load.
