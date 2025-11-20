# Playwright TS SDET Framework

Purpose:
- Demonstrates a professional Playwright + TypeScript test framework with UI, API, and hybrid tests.
- Designed for CI (GitHub Actions), Docker, parallel execution, traces, and reporting.

Quickstart:
1. Install: `npm install`
2. Run locally: `npx playwright test`
3. Run in Docker: `docker build -t playwright-sdet . && docker run --rm playwright-sdet`
4. CI: see .github/workflows/ci.yml

Structure:
- src/config: runtime config
- src/fixtures: shared fixtures
- src/pages: Page Objects
- src/utils: helpers (apiClient, logger)
- src/tests: ui, api, integration

Why this matters:
- Shows UI + API hybrid testing, CI, and SDET design patterns.
