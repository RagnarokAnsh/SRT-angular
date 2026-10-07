import { expect, signIn, test } from './fixtures';

/*
 * Demo data: Shivaji Nagar AWC (Jaipur Urban, Sector 4) has 8 students, Gandhi Colony AWC
 * (Jaipur Urban, Sector 1) has 4 and Sanganer Gaon AWC (Sanganer, Sector 2) has 1.
 * aww@ works at Shivaji Nagar, aww2@ at Gandhi Colony, aww3@ has no centre, and the
 * supervisor is responsible for Sector 4.
 */

const rows = '.list > li.row';

test.describe('who sees which students', () => {
  test('a worker sees only the students of their own centre', async ({ page }) => {
    await signIn(page, 'aww@demo.in');
    await page.goto('/students');
    await expect(page.locator(rows)).toHaveCount(8);
    await expect(page.getByText('Saanvi Gupta')).toHaveCount(0); // Gandhi Colony
    await expect(page.getByText('Kavya Joshi')).toHaveCount(0); // Sanganer Gaon

    await page.goto('/students/9/edit'); // a Gandhi Colony student
    await expect(page.getByText("You can't edit this student")).toBeVisible();
    await expect(page.locator('form')).toHaveCount(0);
  });

  test("another centre's worker sees only theirs", async ({ page }) => {
    await signIn(page, 'aww2@demo.in');
    await page.goto('/students');
    await expect(page.locator(rows)).toHaveCount(4);
    await expect(page.getByText('Aarav Kumar')).toHaveCount(0);

    await page.goto('/dashboard');
    await expect(page.locator('.kpi', { hasText: 'Students' })).toContainText('4');
  });

  test('a worker without a centre sees nobody', async ({ page }) => {
    await signIn(page, 'aww3@demo.in');
    for (const path of [
      '/students',
      '/students/new',
      '/students/1/edit',
      '/dashboard',
      '/competencies/1/assess',
    ]) {
      await page.goto(path);
      await expect(page.getByText("Your account isn't linked to a centre").first()).toBeVisible();
      await expect(page.locator('form'), path).toHaveCount(0);
      await expect(page.locator(rows), path).toHaveCount(0);
    }
  });

  test('a supervisor sees only the centres in their sector', async ({ page }) => {
    await signIn(page, 'supervisor@demo.in');
    await page.goto('/students');
    await expect(page.locator(rows)).toHaveCount(8);
    await expect(page.getByText('Saanvi Gupta')).toHaveCount(0);

    await page.goto('/students/9/edit');
    await expect(page.getByText("You can't edit this student")).toBeVisible();

    await page.goto('/students/new');
    // The list arrives after the form; reopen until it's there. (The wrapper is clicked
    // because the floating label sits on top of the select.)
    const centreField = page
      .locator('mat-form-field')
      .filter({ has: page.locator('mat-select[formcontrolname=anganwadiId]') });
    await expect(async () => {
      await page.keyboard.press('Escape');
      await centreField.locator('.mat-mdc-text-field-wrapper').click({ timeout: 2000 });
      await expect(page.getByRole('option')).toHaveText(['Shivaji Nagar AWC (AWC-JP-001)'], {
        timeout: 1000,
      });
    }).toPass({ timeout: 20_000 });
  });

  test('administrators see every centre', async ({ page }) => {
    await signIn(page, 'admin@demo.in');
    await page.goto('/students');
    await expect(page.locator(rows)).toHaveCount(13);
  });
});

test.describe('who can open which pages', () => {
  const blocked: Record<string, string[]> = {
    'aww@demo.in': ['/admin', '/admin/users', '/admin/centers/new', '/supervisor', '/state'],
    'supervisor@demo.in': ['/dashboard', '/competencies', '/competencies/1/assess', '/admin'],
    'cdpo@demo.in': ['/students', '/dashboard', '/competencies', '/admin', '/supervisor'],
    'dpo@demo.in': ['/students', '/dashboard', '/admin/users', '/cdpo'],
    'state@demo.in': ['/students', '/dashboard', '/admin/centers', '/dpo'],
    'admin@demo.in': ['/state', '/dpo', '/cdpo', '/supervisor'],
  };

  for (const [email, paths] of Object.entries(blocked)) {
    test(`${email} can't open other roles' pages, and every menu link works`, async ({ page }) => {
      await signIn(page, email);
      const menu = page
        .locator('nav')
        .filter({ has: page.locator('a[href]') })
        .first();
      const links = await menu
        .locator('a[href]')
        .evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href') ?? ''));
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        await page.goto(link);
        await expect(page, `menu link ${link}`).not.toHaveURL(/\/unauthorized/);
      }
      for (const path of paths) {
        await page.goto(path);
        await expect(page, path).toHaveURL(/\/unauthorized$/);
      }
    });
  }

  test('signed-out visitors are asked to sign in first', async ({ page }) => {
    for (const path of ['/students', '/admin/users', '/dashboard', '/supervisor']) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?returnUrl=${encodeURIComponent(path)}`));
    }
  });
});
