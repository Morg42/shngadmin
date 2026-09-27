import { defineConfig, devices } from '@playwright/test';

/**
 * Visual regression config, scoped to the button style guide
 * (/dev/style-guide) only - see the migration plan
 * (~/.claude/plans/spicy-tinkering-hummingbird.md, Part 3) for why this
 * doesn't attempt to screenshot the live app. Runs against `ng serve`
 * (matches the dev-only style-guide route's own environment.production
 * check) rather than a production build - revisit only if a real dev/prod
 * CSS discrepancy is ever found.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  webServer: {
    // /dev/style-guide needs no backend, but the app shell (top nav/auth)
    // still calls it on every route regardless - piping out vite's proxy
    // ECONNREFUSED noise here (not a real error for this suite) keeps a
    // shng-less run's output free of messages that never affect pass/fail.
    command:
      "npm start 2>&1 | grep --line-buffered -vE 'http proxy error:|AggregateError \\[ECONNREFUSED\\]|at internalConnectMultiple \\(node:net|at afterConnectMultiple \\(node:net'",
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
