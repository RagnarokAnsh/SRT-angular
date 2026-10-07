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
