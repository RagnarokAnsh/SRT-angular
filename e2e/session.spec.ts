import { type Page } from '@playwright/test';

import { DEMO_PASSWORD, expect, signIn, test } from './fixtures';

async function signOut(page: Page): Promise<void> {
  await page.locator('app-account-menu button').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function fillLogin(page: Page, email: string): Promise<void> {
  await page.getByLabel('Email').fill(email);
  await page.locator('input[formcontrolname=password]').fill(DEMO_PASSWORD);
  await page.locator('button[type=submit]').click();
}

test.describe('sessions across tabs', () => {
  test('signing in or out in one tab updates the others', async ({ page }) => {
    await page.goto('/login');
    const other = await page.context().newPage();
    await signIn(other, 'aww@demo.in');
    await expect(page).toHaveURL(/\/home$/);

    await signOut(other);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test("someone else signing in elsewhere replaces the previous user's page, unsaved changes and all", async ({
    page,
  }) => {
    // The second worker's stored session, kept to replay later.
    const other = await page.context().newPage();
    await signIn(other, 'aww2@demo.in');
    const stored = await other.evaluate(() => ({
      token: localStorage.getItem('auth_token') ?? '',
      user: localStorage.getItem('user_data') ?? '',
    }));
    await signOut(other);

    await signIn(page, 'aww@demo.in');
    await page.goto('/students/new');
    await page.getByLabel('Name').fill('Half-typed name');

    // What a tab in the background sees at once when, meanwhile, someone signed out and the
    // second worker signed in.
    await other.evaluate(({ token, user }) => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.setItem('user_data', user);
      localStorage.setItem('auth_token', token);
    }, stored);

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/students');
    await expect(page.getByText('Saanvi Gupta')).toBeVisible();
    await expect(page.getByText('Aarav Kumar')).toHaveCount(0);
  });

  test('after an expired session, only the same person goes back to their page', async ({
    page,
  }) => {
    // The page was left by user 3 (the second worker); user 2 signs in.
    await page.goto('/login?reason=expired&returnUrl=%2Fstudents&uid=3');
    await fillLogin(page, 'aww@demo.in');
    await expect(page).toHaveURL(/\/home$/);

    await signOut(page);
    await page.goto('/login?reason=expired&returnUrl=%2Fstudents&uid=2');
    await fillLogin(page, 'aww@demo.in');
    await expect(page).toHaveURL(/\/students$/);
  });
});
