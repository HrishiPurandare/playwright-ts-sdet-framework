# Playwright TS SDET Framework

A Playwright and TypeScript test framework with UI, API and hybrid tests. The suite starts its own small demo app, so it has no dependency on third-party sites.

## Run it

```bash
npm ci
npx playwright install chromium firefox
npm test
npm run test:report
```

Set `BASE_URL` to run against an app that is already running instead of the demo app.

## Structure

- `demo-app/`: dependency-free Node app under test
- `src/config/`: runtime configuration
- `src/pages/`: page objects
- `src/fixtures/`: shared fixtures
- `src/tests/ui/`: browser tests, including a negative login path
- `src/tests/api/`: API tests, including validation and 404 paths
- `src/tests/integration/`: creates data through the API and verifies it in the UI

## CI

`.github/workflows/playwright-ci.yml` type-checks the code, runs the suite on Chromium and Firefox, and uploads the HTML report. Traces, screenshots and video are kept for failures.
