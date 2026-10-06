import { expect, expectAccessible, expectNoHorizontalScroll, signIn, test } from './fixtures';

test.describe('dashboard', () => {
  test('summarises the centre and exports to Excel', async ({ page }) => {
    await signIn(page, 'aww@demo.in');
    await page.goto('/dashboard');
    await expect(page.getByRole('img', { name: /Beginning: \d+/ }).first()).toBeVisible();
    await expect(page.locator('.kpi', { hasText: 'Children' })).toContainText(/\d+/);
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Show as table' }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Classification' })).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Excel' }).click();
    expect((await download).suggestedFilename()).toMatch(/^srt-dashboard-.+\.xlsx$/);
  });
});
