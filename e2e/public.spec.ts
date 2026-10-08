import { expect, expectAccessible, expectNoHorizontalScroll, signIn, test } from './fixtures';

test.describe('public pages', () => {
  test('home page shows the approved text and a wheel that opens the domains', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('School Ready Children');
    await expect(page.getByText('School readiness is a crucial phase')).toBeVisible();
    await expect(page.getByText('School readiness lays the foundation')).toBeVisible();
    const wheel = page.getByRole('img', { name: /School readiness framework: 6 domains/ });
    await expect(wheel).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);

    // The domain list is the keyboard path into the wheel. Signed out, it asks to sign in
    // first, then opens the domain.
    const domains = page.getByRole('navigation', { name: 'Six domains of development' });
    await expect(domains.getByRole('link')).toHaveCount(6);
    await domains.getByRole('link', { name: /Language & Literacy Development/ }).click();
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcompetencies%2Fdomain%2Flanguage/);
    await page.getByLabel('Email').fill('aww@demo.in');
    await page.locator('input[formcontrolname=password]').fill('demo1234');
    await page.locator('button[type=submit]').click();
    await expect(page).toHaveURL(/\/competencies\/domain\/language--literacy-development$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Language & Literacy Development' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Listening Comprehension/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('a signed-in worker opens a domain or competency straight from the wheel', async ({
    page,
  }) => {
    await signIn(page, 'aww@demo.in');
    await expect(page).toHaveURL(/\/home$/);
    if ((page.viewportSize()?.width ?? 0) < 600) {
      // Phones draw the domains only; a domain opens its page.
      await page.locator('app-readiness-wheel .domain[data-domain="0"] .segment--domain').click();
      await expect(page).toHaveURL(/\/competencies\/domain\/cognitive-development$/);
      await page.getByRole('link', { name: /Seriation/ }).click();
    } else {
      await page.locator('app-readiness-wheel [data-competency="seriation"]').click();
    }
    await expect(page).toHaveURL(/\/competencies\/\d+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Seriation' })).toBeVisible();
    // Back leads to the competency's domain, then to all the domains.
    await page.getByRole('link', { name: 'Cognitive Development' }).first().click();
    await expect(page).toHaveURL(/\/competencies\/domain\/cognitive-development$/);
    await page.getByRole('link', { name: 'School Readiness – Domains' }).first().click();
    await expect(page).toHaveURL(/\/competencies$/);
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
        await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcompetencies%2Fdomain%2F/);
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
