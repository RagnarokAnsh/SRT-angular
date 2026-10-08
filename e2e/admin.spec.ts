import { expect, expectAccessible, expectNoHorizontalScroll, pick, signIn, test } from './fixtures';

test.describe('administrator', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin@demo.in');
  });

  test('adds an Anganwadi worker linked to a centre', async ({ page }) => {
    await page.goto('/admin/users/new');
    await page.getByLabel('Full Name').fill('Geeta Kumari');
    await page.getByLabel('Email').fill('Geeta@Demo.in');
    await page.locator('input[formcontrolname=password]').fill('geeta2026');
    await pick(page, 'Role', 'Anganwadi worker');
    await page.getByRole('radio', { name: 'Female' }).check();
    await pick(page, 'Country', 'India');
    await pick(page, 'State', 'Rajasthan');
    await pick(page, 'District', 'Jaipur');
    await pick(page, 'Project', 'Jaipur Urban');
    await pick(page, /^\s*Sector\s*$/, 'Sector 4');
    await page.getByRole('button', { name: 'Create User' }).click();
    await expect(page.getByText('This field is required.')).toBeVisible(); // the centre
    await pick(page, 'Anganwadi Center', /Shivaji Nagar AWC/);
    await expectNoHorizontalScroll(page);
    await page.getByRole('button', { name: 'Create User' }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    const row = page.locator('.row', { hasText: 'Geeta Kumari' });
    await expect(row).toContainText('geeta@demo.in');
    await expect(row).toContainText('Shivaji Nagar AWC');
  });

  test("moving a worker to another sector clears the old sector's centre", async ({ page }) => {
    await page.goto('/admin/users/2/edit');
    const centre = page
      .locator('mat-form-field')
      .filter({ has: page.locator('mat-label', { hasText: 'Anganwadi Center' }) });
    await expect(centre).toContainText('Shivaji Nagar AWC');
    await pick(page, /^\s*Sector\s*$/, 'Sector 1');
    await expect(centre).not.toContainText('Shivaji Nagar AWC');
    await page.getByRole('button', { name: 'Update User' }).click();
    await expect(page.getByText('This field is required.')).toBeVisible();
    await pick(page, 'Anganwadi Center', /Gandhi Colony AWC/);
    await page.getByRole('button', { name: 'Update User' }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.locator('.row', { hasText: 'aww@demo.in' })).toContainText(
      'Gandhi Colony AWC',
    );
  });

  test("can't delete their own account", async ({ page }) => {
    await page.goto('/admin/users');
    const own = page.locator('.row', { hasText: 'admin@demo.in' });
    await expect(own.getByText('You')).toBeVisible();
    await expect(own.getByRole('button', { name: /Delete/ })).toHaveCount(0);
    await expectAccessible(page);
  });

  test('adds a centre', async ({ page }) => {
    await page.goto('/admin/centers/new');
    await page.getByLabel('Center Name').fill('Malviya Nagar AWC');
    await page.getByLabel('Center Code').fill('awc-jp-020');
    await pick(page, 'Country', 'India');
    await pick(page, 'State', 'Rajasthan');
    await pick(page, 'District', 'Jaipur');
    await pick(page, 'Project', 'Sanganer');
    await pick(page, /^\s*Sector\s*$/, 'Sector 2');
    await page.getByRole('button', { name: 'Create Center' }).click();
    await expect(page).toHaveURL(/\/admin\/centers$/);
    await expect(page.getByText('AWC-JP-020')).toBeVisible();
  });

  test('picks a centre for the dashboard and can switch to another', async ({ page }) => {
    await page.goto('/dashboard');
    await pick(page, 'Center', /Sanganer Gaon AWC/);
    // The centre's name shows even though it has hardly any results yet.
    await expect(page.locator('app-page-header')).toContainText('Sanganer Gaon AWC');
    await expect(page.locator('.kpi', { hasText: 'Students' })).toContainText('1');

    await page.getByRole('button', { name: 'Change center' }).click();
    await pick(page, 'Center', /Gandhi Colony AWC/);
    await expect(page.locator('app-page-header')).toContainText('Gandhi Colony AWC');
    await expect(page.locator('.kpi', { hasText: 'Students' })).toContainText('4');
  });

  test('picks a centre to assess and can switch before recording', async ({ page }) => {
    await page.goto('/competencies/2/assess');
    await pick(page, 'Center', /Gandhi Colony AWC/);
    await expect(page.getByRole('checkbox', { name: /Saanvi Gupta/ })).toBeVisible();
    await page.getByRole('button', { name: 'Change center' }).click();
    await pick(page, 'Center', /Shivaji Nagar AWC/);
    await expect(page.getByRole('checkbox', { name: /Aarav Kumar/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Saanvi Gupta/ })).toHaveCount(0);
  });

  test('workers cannot open admin pages', async ({ page }) => {
    await page.locator('app-account-menu button').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);
    await signIn(page, 'aww@demo.in');
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/unauthorized$/);
  });
});
