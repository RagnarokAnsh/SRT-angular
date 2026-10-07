import { expect, expectAccessible, expectNoHorizontalScroll, signIn, test } from './fixtures';

test.describe('public pages', () => {
  test('home page explains the framework with a usable wheel', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ready');
    const wheel = page.getByRole('img', { name: /School readiness framework: 6 domains/ });
    await expect(wheel).toBeVisible();

    // The domain list is the keyboard path into the wheel.
    await page.getByRole('button', { name: /Language & Literacy Development/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Language & Literacy Development' }),
    ).toBeFocused();
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Listening Comprehension' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Physical & Motor Development' })).toBeVisible();
    await page.getByRole('button', { name: 'All domains' }).click();
    await expect(page.getByRole('heading', { name: 'Six domains of development' })).toBeVisible();

    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });

  for (const lang of ['en', 'hi'] as const) {
    test.describe(`in ${lang}`, () => {
      test.use({ lang });

      test('wheel labels are large and upright on phones, and tapping one opens it', async ({
        page,
      }) => {
        await page.goto('/home');
        const wheel = page.locator('app-readiness-wheel svg.wheel__svg');
        await wheel.scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready);
        const labels = await wheel.evaluate((svg) => {
          const scale = svg.getBoundingClientRect().width / 500;
          return [...svg.querySelectorAll('.label--domain')].map((text) => ({
            px: Number(text.getAttribute('font-size')) * scale,
            curved: !!text.querySelector('textPath'),
          }));
        });
        expect(labels.length).toBeGreaterThanOrEqual(6);
        // Never smaller than 14 px, on any screen.
        expect(Math.min(...labels.map((l) => l.px))).toBeGreaterThanOrEqual(14);
        const phone = (page.viewportSize()?.width ?? 0) < 500;
        if (phone) expect(labels.some((l) => l.curved)).toBe(false);

        await wheel.locator('.domain[data-domain="2"] .segment--domain').click();
        await expect(page.locator('app-readiness-wheel .panel h3')).toBeFocused();
        await expect(page.locator('.domain.is-dimmed')).toHaveCount(5);
      });
    });
  }

  test('switches to Hindi and remembers the choice', async ({ page }) => {
    await page.goto('/home');
    await page.getByRole('button', { name: /Change language/ }).click();
    await page.getByRole('menuitemradio', { name: 'हिंदी' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('तैयार');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('तैयार');
    await expect(page).toHaveTitle(/स्कूल के लिए तैयार बच्चे/);
  });

  test('login explains what is wrong', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('This field is required.').first()).toBeVisible();

    await page.getByLabel('Email').fill('aww@demo.in');
    await page.locator('input[formcontrolname=password]').fill('wrong-password');
    await page.locator('button[type=submit]').click();
    await expect(page.getByRole('alert')).toContainText('The email or password is incorrect.');
    await expectAccessible(page);
  });

  test('returns to the requested page after signing in', async ({ page }) => {
    await page.goto('/students');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fstudents/);
    await page.getByLabel('Email').fill('aww@demo.in');
    await page.locator('input[formcontrolname=password]').fill('demo1234');
    await page.locator('button[type=submit]').click();
    await expect(page).toHaveURL(/\/students$/);
  });

  test('old addresses still work', async ({ page }) => {
    await signIn(page, 'aww@demo.in');
    await page.goto('/students/create');
    await expect(page).toHaveURL(/\/students\/new$/);
    await page.goto('/select-competency');
    await expect(page).toHaveURL(/\/competencies$/);
  });

  test('unknown pages say so', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
