# LEARN: how to study this repo

This is the Playwright framework you'll be asked about most in SDET interviews. The goal is not to remember the code but to **explain every decision**: why a saved login, why personas, why the network is mocked in one test and not another, how you know the tests would catch a real bug.

Each part follows the same loop: key concepts → run it → read it in order → break it → explain it → quiz.

Before you start: the bank must be running (`docker compose up --build --wait` in `novabank`). Stop Ollama first (8 GB Mac).

---

# Part 1: retargeting the framework to NovaBank (Forge90 day 20)

Budget: two 2-hour sessions, plus the quiz (45 min).

## 1. Key concepts

**System under test vs test framework.** The bank lives in its own repo and runs in Docker. This repo only drives it. The suite doesn't start the bank (`webServer` was removed): the same tests can then run against a laptop, CI or a shared test environment, by changing `BASE_URL`.

**Projects and dependencies** (`playwright.config.ts`). Three projects:
- `setup` runs `tests/auth.setup.ts`: logs Sara, Omar and Lina in through the real login page and saves each browser's storage (localStorage tokens) to `.auth/<name>.json`.
- `chromium` and `firefox` depend on `setup`, so they always start after it.
- Firefox has `grepInvert: /@real-login/`: the 4 tests that call the real login endpoint run in Chromium only.

**Storage state.** Playwright can save a browser context's cookies and localStorage, and start a new context from that file. NovaBank keeps its JWTs in localStorage (`novabank.auth`), so a saved file *is* a logged-in customer. Every test then starts logged in, without typing a password.

Why it matters here: the bank allows **10 logins a minute** (`AUTH_THROTTLE_RATE`). Logging in per test would hit `429 Too Many Requests` within seconds. Per run: 3 setup logins plus 4 real-login tests = 7.

**The `customer` option fixture** (`src/fixtures/index.ts`). `test.use({ customer: 'omar' })` at the top of a file or `describe` picks the saved login *and* the API token. `storageState` is overridden to read from `customer`. That's the "roles" pattern, done as personas:

| Persona | Why | Used by |
|---|---|---|
| Sara | two active accounts | transfers between own accounts |
| Omar | one account | adding beneficiaries; "no other account" |
| Lina | three accounts, one frozen; **nobody moves her money** | balance and statement checks |

Splitting work by persona is what makes parallel runs safe: two workers never fight over the same data.

**API for setup, browser for the check.** `NovaBankApi` reads the access token out of the saved login (`accessTokenFor`) instead of logging in again. Tests use it to *arrange* data (a confirmed beneficiary) and to *verify* the result exactly (one debit, one credit). The step the test is about always goes through the UI.

**Fixtures with teardown.** `confirmedPayee` creates a beneficiary through the API, reads the code from Mailpit, confirms it, hands it to the test, and deletes it afterwards, pass or fail. `cleanupPayees` does the same for beneficiaries a test adds through the UI (by name). The bank allows 100 beneficiaries per customer; without cleanup, local runs would hit that cap.

**Reading the real email.** `otpFor` (`src/api/mailpit.ts`) polls Mailpit's API with `expect.poll` until the code email arrives. That proves the whole chain: the bank made a code, sent it over SMTP, and the code in the email is the one it accepts. A test that reads the code from the database proves much less.

**Locators.** Page objects use, in order of preference:
1. `getByLabel` / `getByRole` for form fields and buttons, as a screen reader would find them. If the `<label for>` breaks, the test breaks: a free accessibility check.
2. `getByTestId` (`data-testid`) for things with no good accessible name: amounts, status badges, rows.

Two traps found while writing them: `getByLabel('Beneficiary')` also matched the "A beneficiary" radio (labels match by substring), so it's `{ exact: true }`; the statement's "To" date field needed `exact` too.

**Waiting.** No `waitForTimeout` anywhere. Web-first assertions (`await expect(locator).toHaveText(...)`) retry until they pass or time out. The first run had one test that read `<option>`s straight away and found an empty list: the dropdown fills in after the page's API calls. Fix: `await expect(option).toHaveCount(1)` before using it (`selectByLabelStart` in `transfer-page.ts`).

**Network mocking, only where reality can't be arranged.**
- *Lost reply* (`transfer.spec.ts`): `route.fetch()` sends the request to the real bank (the money moves), then `route.abort('connectionreset')` throws the answer away. The app shows "can't tell whether this went through"; Try again reuses the same `Idempotency-Key`; the bank replays the first result. The test checks both keys match and the API shows **one** debit. This is the most important test in the suite.
- *Clear refusal*: `route.fulfill` with a 400 and a business code. The next attempt must use a **new** key.
- *Expired session*: every `/api/**` call answers 401. Mocked on purpose: refresh tokens rotate, and a real refresh would blacklist the token every other test shares.

**Money as integers.** `src/data/money.ts` turns `"18,240.15"` into `1824015n` (fils, BigInt). The dashboard total and the running-balance chain are compared exactly. With floats, `0.1 + 0.2` is `0.30000000000000004` and a test that rounds can hide the bug it's hunting.

**Known bugs as `test.fail()`.** Two tests described the *right* behaviour and were marked `test.fail(true, reason)`. They pass while the bug exists, and fail the day it's fixed, which tells you to remove the marker. Better than `test.skip` (silently never runs) or a red build everyone learns to ignore. That's exactly what happened: NovaBank 1.2.0 fixed both bugs, both tests went red in both browsers, and the markers were removed. One catch: the session bug was a race that showed up only ~15 runs in 16, so its `test.fail()` occasionally went red with no fix at all. A `test.fail()` on a timing bug is itself flaky; fix the bug soon.

**Preconditions out loud.** The limit test needs an account with more than AED 10,000.01, or the bank answers "insufficient funds" first and the test passes or fails for the wrong reason. It picks the richest account and asserts the precondition with a message. The bank's own smoke test had exactly this hidden assumption (found today, fixed in novabank).

## 2. Run it

```bash
npm ci && npx playwright install chromium firefox
npx playwright test                              # everything, both browsers
npx playwright test --project=setup --project=chromium tests/transfer.spec.ts
npx playwright test -g "answer was lost" --headed --workers=1
npx playwright show-report                       # then open a test, look at its steps
npx playwright test --repeat-each=3 --grep-invert @real-login   # flakiness check
```

Open a trace: run a test, make it fail (see Break it), then `npx playwright show-trace test-results/<folder>/trace.zip`. Find the network tab, the DOM snapshot before and after each step, and the console.

## 3. Read it in this order

1. `playwright.config.ts`: projects, dependencies, `grepInvert`, `timezoneId`.
2. `src/data/customers.ts`, then `tests/auth.setup.ts`: how a login becomes a file.
3. `src/fixtures/index.ts`: `customer`, `storageState`, `api`, `confirmedPayee`, `cleanupPayees`.
4. `src/api/novabank-api.ts` and `src/api/mailpit.ts`.
5. `src/pages/transfer-page.ts` (the most complex page object), then the others.
6. `tests/transfer.spec.ts`: read "the money moved but the answer was lost" line by line.
7. `tests/statement.spec.ts`: the running-balance test.
8. `tests/login.spec.ts`: the two `@real-login` tests and the expired-session mock.

## 4. Break it

Each one should make a specific test fail. Predict which before you run it.

1. In `auth.setup.ts`, comment out the `storageState({ path })` line. What fails, and with what message?
2. In `transfer.spec.ts`, change `route.abort('connectionreset')` to `route.continue()` after the fetch. (Hint: the request goes twice.) What does the app show?
3. Remove `{ exact: true }` from the beneficiary select in `transfer-page.ts`. Read the strict-mode error.
4. Run the whole suite 3 times in a row *with* the real-login tests, quickly. What happens on the second or third run, and why? How would you fix it in CI without weakening the bank?
5. In `money.ts`, replace `toFils` with `Math.round(parseFloat(amount) * 100)`. Does any test fail? Why is the BigInt version still the right choice? (Try `parseFloat('9007199254740993.01')`.)
6. Delete the `if (customer !== 'sara') return;` line in `transfer.spec.ts`. Which test fails, and why does a top-level `beforeEach` run for it?

## 5. Explain it (interview questions)

| Question | Answer in one breath |
|---|---|
| How do you handle login in a big Playwright suite? | Setup project logs each role in once through the UI, saves storage state, every test starts from it; the API client reuses the same token. |
| How do you run tests in parallel against shared data? | Personas own their data; every created record is unique; tests assert on their own rows, never absolute totals; fixtures clean up. |
| When do you mock the network? | When reality can't be arranged on demand: a dropped reply, an expired session. Otherwise the real API, because mocks drift from it. |
| How do you test idempotency from the UI? | Let the request reach the server with `route.fetch`, drop the reply, retry, assert the same key and one debit. |
| What's a flaky test and how do you prevent one? | One that passes and fails without a code change. Web-first assertions, no sleeps, isolated data, `--repeat-each` before merging. |
| How do you know your tests would catch a bug? | Plant bugs in the app and see which tests fail (mutation testing). Today: 3 of 4 caught; the 4th was an equivalent mutant. |
| A known bug, but you don't want a red build? | `test.fail()` with the reason: green now, red when fixed. |
| Why `getByLabel` over CSS selectors? | It finds elements the way users and screen readers do, survives restyling, and fails if the label is broken. |

## 6. Gotchas met today

- **Top-level `beforeEach` runs for every test in the file**, including the Omar `describe`, which has no "Everyday" account. Fixed with a guard; better would be one persona per file.
- **Lina's Premier account has only 3 credits**, so "page 2 of credits" never existed. The paging test now uses debits and asserts "more than 20" first.
- **Sara's Everyday account was drained** to AED 4,734.86 by an earlier manual AED 10,000 transfer. Two tests (here and in the bank's smoke test) assumed it was rich.
- **`npx playwright install firefox`** downloads about 100 MB the first time.

## 7. The bugs this suite found (and where they live)

| Bug | Where | Test |
|---|---|---|
| "Total balance (1 accounts)" | novabank `pages/accounts/accounts.html` | accounts.spec "the total says 1 account" (fixed in NovaBank 1.2.0) |
| Expired session loses the page (`returnUrl=/`) | novabank `core/auth.interceptor.ts`: `router.url` read during the first navigation | login.spec "returns to the page" (fixed in NovaBank 1.2.0: `currentPlace()` uses the navigation in progress, or the browser address before the first navigation) |
| Smoke test assumed the first account holds > AED 10,000.01 | novabank `e2e/smoke.py` | fixed there |

## 8. Tested the tests

Four bugs planted in the Angular app, rebuilt, Chromium suite run:

| Planted bug | Caught by |
|---|---|
| Dashboard total skips frozen accounts | accounts "the total is the exact sum" |
| Paging drops the filters | statement "the next page keeps the filters" and "a page past the end" |
| A new Idempotency-Key on every send (so a retry pays twice) | transfer "the answer was lost" |
| `safeReturnUrl` removed (open redirect) | **nothing**, and that's correct |

Why the last one survived: Angular's `router.navigateByUrl('https://evil.example/phish')` doesn't leave the app. It treats the text as an in-app path, matches the `**` route and lands on Accounts. So the app's check is defence in depth, and the user-visible behaviour is the same with or without it: an *equivalent mutant*. The test stays, because it guards the outcome if someone later switches to `window.location.href = returnUrl`.

## 9. Quiz (Part 1)

1. What does `dependencies: ['setup']` guarantee, and what doesn't it guarantee?
2. Why does the Firefox project skip `@real-login` tests? What would you lose if Chromium skipped them too?
3. The access token lives 15 minutes and refresh tokens rotate. What would break if the suite took 20 minutes, and why would it break *only some* tests?
4. Why does `NovaBankApi` read the token from `.auth/*.json` instead of calling `/api/auth/login/`?
5. In the lost-reply test, why `route.fetch()` and not `route.abort()` on its own? What would the test prove with `abort()` alone?
6. Why is the expired-session test mocked, while the wrong-password test isn't?
7. Give two reasons the balance tests run as Lina.
8. `cleanupPayees` deletes by name. What could go wrong, and why is it acceptable here?
9. What's the difference between `test.fail()`, `test.skip()` and `test.fixme()`? When is each right?
10. Explain "equivalent mutant" with today's example.
11. The CI tests novabank `v1.2.0`, not `main`. Give one advantage and one risk.
12. Why `timezoneId: 'Asia/Dubai'` in the config?
