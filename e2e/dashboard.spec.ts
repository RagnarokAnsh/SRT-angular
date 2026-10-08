import { expect, expectAccessible, expectNoHorizontalScroll, signIn, test } from './fixtures';

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'aww@demo.in');
    await page.goto('/dashboard');
  });

  test('summarises the centre, domain by domain, and exports to Excel', async ({ page }) => {
    await expect(page.locator('.kpi', { hasText: 'Students' })).toContainText('8');
    await expect(page.getByRole('heading', { name: 'All domains together' })).toBeVisible();
    await expect(page.getByRole('img', { name: /Beginning: \d+/ }).first()).toBeVisible();
    await expect(page.getByText('Since the session before:').first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);

    // A domain opens its competencies.
    await page.getByRole('button', { name: /Physical & Motor Development/ }).click();
    await expect(page).toHaveURL(/view=competencies/);
    await expect(page.getByRole('link', { name: 'Gross Motor Development' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Classification' })).toHaveCount(0);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Excel' }).click();
    expect((await download).suggestedFilename()).toMatch(/^srt-dashboard-.+\.xlsx$/);
  });

  test('compares sessions competency by competency, with names by level', async ({ page }) => {
    await page.getByRole('button', { name: 'Competencies', exact: true }).click();
    const classification = page.locator('li.item', { hasText: 'Classification' });
    await expect(classification.getByRole('img', { name: /session 3/ })).toBeVisible();

    // Sessions 1 and 2 only: session 1 against session 2.
    await page.getByRole('button', { name: 'Session 3' }).click();
    await expect(classification.getByRole('img')).toHaveCount(2);
    await classification.getByRole('button', { name: 'Show names' }).click();
    const second = classification.locator('.names__session', { hasText: 'Session 2' });
    await expect(second.getByRole('heading', { name: 'Session 2' })).toBeVisible();
    await expect(second.getByRole('list', { name: 'School Ready' })).toContainText('Diya Sharma');
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Show as table' }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Classification' })).toBeVisible();
  });

  test("shows each student's levels, session by session", async ({ page }) => {
    await page.getByRole('button', { name: 'Students', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search students' }).fill('diya');
    await expect(page.locator('.student')).toHaveCount(1);
    await page.getByRole('button', { name: /Diya Sharma/ }).click();
    const table = page.getByRole('table', { name: 'Diya Sharma' });
    await expect(table.getByRole('rowheader', { name: 'Classification' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });

  test('lists who needs attention, and why', async ({ page }) => {
    await page.locator('.kpi', { hasText: 'Need attention' }).click();
    await expect(page).toHaveURL(/view=attention/);
    const ramSingh = page.locator('li.student', { hasText: 'Ram Singh' });
    await expect(ramSingh).toContainText('2 went down');
    await expect(ramSingh.locator('li.item', { hasText: 'Fine Motor Development' })).toContainText(
      'Went down',
    );
    // Missed the latest session the others had.
    await expect(page.locator('li.student', { hasText: 'Meera Patel' })).toContainText(
      'Seriation (S1)',
    );
    // Students who improved everywhere aren't listed.
    await expect(page.locator('li.student', { hasText: 'Diya Sharma' })).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });
});
