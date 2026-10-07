import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test as base } from '@playwright/test';

export const DEMO_PASSWORD = 'demo1234';

export const test = base.extend<{ lang: 'en' | 'hi' }>({
  lang: ['en', { option: true }],
  page: async ({ page, lang }, use) => {
    // Sets the starting language once; a language chosen in the test survives reloads.
    await page.addInitScript((l) => {
      try {
        if (!localStorage.getItem('srt-language')) localStorage.setItem('srt-language', l);
      } catch {
        /* ignore */
      }
    }, lang);
    await use(page);
  },
});

export { expect };

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email|ईमेल/i).fill(email);
  await page.locator('input[formcontrolname=password]').fill(DEMO_PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  // Let the welcome message go so it doesn't cover anything.
  await page
    .locator('.mat-mdc-snack-bar-action button')
    .click({ timeout: 2000 })
    .catch(() => undefined);
}

/** Opens a Material select by its label (retrying while its list is still loading) and picks an option. */
export async function pick(
  page: Page,
  label: string | RegExp,
  option: string | RegExp,
): Promise<void> {
  const field = page
    .locator('mat-form-field')
    .filter({ has: page.locator('mat-label').filter({ hasText: label }) })
    .first();
  const wanted = page.getByRole('option', { name: option }).first();
  for (let attempt = 0; attempt < 10; attempt++) {
    // A short timeout per attempt: one blocked click must not use up the whole test.
    await field
      .locator('.mat-mdc-text-field-wrapper')
      .click({ timeout: 5000 })
      .catch(() => undefined);
    if (await wanted.isVisible().catch(() => false)) break;
    await page.keyboard.press('Escape');
    // Wait for the empty panel to close, or its backdrop would swallow the next click.
    await page
      .locator('.cdk-overlay-backdrop')
      .waitFor({ state: 'detached', timeout: 2000 })
      .catch(() => undefined);
    await page.waitForTimeout(300);
  }
  await wanted.click();
}

/**
 * The page must never be wider than the screen (the app is used on small phones). Compared
 * with the layout width, not `innerWidth`: phone browsers zoom out to fit wide content, which
 * grows `innerWidth` and would hide the problem.
 */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, layoutWidth } = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
    layoutWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, 'page is wider than the screen').toBeLessThanOrEqual(layoutWidth + 1);
}

/** No serious or critical accessibility problems (axe-core, WCAG 2.1 A/AA rules). */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(', ')})`,
    ),
  ).toEqual([]);
}
