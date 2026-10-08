import { expect, expectAccessible, expectNoHorizontalScroll, signIn, test } from './fixtures';

test.describe('public pages', () => {
  test('home page shows only the approved text and the wheel; a competency opens after logging in', async ({
    page,
  }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('School Ready Children');
    await expect(page.getByText('School readiness is a crucial phase')).toBeVisible();
    await expect(page.getByText('School readiness lays the foundation')).toBeVisible();
    await expect(
      page.getByRole('group', { name: /School readiness framework: 6 domains/ }),
    ).toBeVisible();
    // No lists or hints under the wheel.
    await expect(page.locator('app-readiness-wheel :is(nav, ul, p)')).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);

    // Competencies show once a domain is chosen (the pointer on it, or a tap on phones).
    const wheel = page.locator('app-readiness-wheel');
    await expect(wheel.locator('.competency')).toHaveCount(0);
    await page.getByRole('button', { name: 'Language and Literacy Development' }).click();
    await expect(wheel.locator('.competency')).toHaveCount(4);
    await expectAccessible(page);

    // Visitors log in first, then the competency opens.
    await page.getByRole('link', { name: 'Listening comprehension' }).click();
    await expect(page).toHaveURL(
      /\/login\?returnUrl=%2Fcompetencies%2Ffind%2Flistening-comprehension/,
    );
    await page.getByLabel('Email').fill('aww@demo.in');
    await page.locator('input[formcontrolname=password]').fill('demo1234');
    await page.locator('button[type=submit]').click();
    await expect(page).toHaveURL(/\/competencies\/7$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Listening comprehension' }),
    ).toBeVisible();
  });

  test('a logged-in worker opens a competency straight from the wheel', async ({ page }) => {
    await signIn(page, 'aww@demo.in');
    await expect(page).toHaveURL(/\/home$/);
    await page.getByRole('button', { name: 'Cognitive Development' }).click();
    await page.getByRole('link', { name: 'Seriation' }).click();
    await expect(page).toHaveURL(/\/competencies\/5$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Seriation' })).toBeVisible();
    // Back leads to the competency's domain, then to all the domains.
    await page.getByRole('link', { name: 'Cognitive Development' }).first().click();
    await expect(page).toHaveURL(/\/competencies\/domain\/cognitive-development$/);
    await page.getByRole('link', { name: 'School Readiness – Domains' }).first().click();
    await expect(page).toHaveURL(/\/competencies$/);
  });

  test('the wheel works with the keyboard', async ({ page }) => {
    await page.goto('/home');
    const domain = page.getByRole('button', { name: 'Creativity Development' });
    await domain.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: 'Imagination' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Creative expression' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: 'Imagination' })).toHaveCount(0);
    await expect(domain).toBeFocused();
  });

  for (const lang of ['en', 'hi'] as const) {
    test.describe(`in ${lang}`, () => {
      test.use({ lang });

      test('wheel labels are large and upright, and a domain shows its competencies', async ({
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

        // Its competencies show, still large enough to read.
        await wheel.locator('.domain[data-domain="2"] .segment--domain').click();
        await expect(page.locator('app-readiness-wheel .competency')).toHaveCount(2);
        const sizes = await wheel.evaluate((svg) => {
          const scale = svg.getBoundingClientRect().width / 500;
          return [...svg.querySelectorAll('.competency .label')].map(
            (text) => Number(text.getAttribute('font-size')) * scale,
          );
        });
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(14);
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
    await expect(page.getByRole('alert')).toContainText('Your email or password is incorrect.');
    // The password is cleared, without a "required" message under the real problem.
    await expect(page.locator('input[formcontrolname=password]')).toHaveValue('');
    await expect(page.getByText('This field is required.')).toHaveCount(0);
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
