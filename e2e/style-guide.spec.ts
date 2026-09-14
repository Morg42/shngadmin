import { test, expect, type Page } from '@playwright/test';

/**
 * Visual regression baseline for the button system migration (see
 * ~/.claude/plans/spicy-tinkering-hummingbird.md, Part 3). Targets
 * /dev/style-guide only - a dev-only page (devOnlyGuard, no auth/backend
 * dependency) built specifically to be a small, controlled surface where a
 * screenshot diff means something, rather than the live app where routine
 * feature work would make the baselines noisy.
 *
 * The first baseline commit for each snapshot is the spec from that point
 * on - review it by hand before committing, don't rubber-stamp
 * --update-snapshots.
 */

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(
    (t) => localStorage.setItem('shngadmin_prefs', JSON.stringify({ themePreference: t })),
    theme,
  );
}

test('style guide - light mode', async ({ page }) => {
  await setTheme(page, 'light');
  await page.goto('/dev/style-guide');
  const guide = page.locator('.style-guide');
  await expect(guide).toBeVisible();
  await expect(guide).toHaveScreenshot('style-guide-light.png', { animations: 'disabled' });
});

test('style guide - dark mode', async ({ page }) => {
  await setTheme(page, 'dark');
  await page.goto('/dev/style-guide');
  const guide = page.locator('.style-guide');
  await expect(guide).toBeVisible();
  await expect(guide).toHaveScreenshot('style-guide-dark.png', { animations: 'disabled' });
});

test('style guide - disabled vs active contrast (dark mode)', async ({ page }) => {
  // secondary was the severity in the original bug this migration started
  // from (disabled looked identical to active in dark mode) - closeup on
  // its row, enabled and disabled buttons side by side, catches a
  // regression a full-page diff could bury.
  await setTheme(page, 'dark');
  await page.goto('/dev/style-guide');
  const row = page.locator('tr[data-severity="secondary"]');
  await expect(row).toBeVisible();
  await expect(row).toHaveScreenshot('style-guide-dark-secondary-row.png', {
    animations: 'disabled',
  });
});
