import { expect, expectAccessible, expectNoHorizontalScroll, signIn, test } from './fixtures';

test.use({ lang: 'hi' });

test.describe('in Hindi', () => {
  test('public pages', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('स्कूल के लिए');
    await expect(page.getByRole('heading', { name: 'विकास के छह क्षेत्र' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'साइन इन करें' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('worker screens', async ({ page }) => {
    await signIn(page, 'aww@demo.in');
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole('heading', { name: 'विकास के छह क्षेत्र' })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto('/competencies');
    await expect(page.getByRole('heading', { name: 'संज्ञानात्मक विकास' })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto('/competencies/1');
    await expect(page.getByRole('heading', { level: 1, name: 'वर्गीकरण' })).toBeVisible();
    await expect(page.getByText('तीन विशेषताओं के आधार पर वस्तुओं का वर्गीकरण करना')).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto('/competencies/1/assess');
    await expect(page.getByRole('button', { name: /आगे बढ़ें/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'सभी क्षेत्र एक साथ' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);

    await page.goto('/students/new');
    await expect(page.getByRole('heading', { name: 'विद्यार्थी जोड़ें' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('admin screens', async ({ page }) => {
    await signIn(page, 'admin@demo.in');
    await page.goto('/admin/users/new');
    await expect(page.getByRole('heading', { name: 'उपयोगकर्ता जोड़ें' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto('/admin/centers');
    await expect(page.getByRole('heading', { name: 'आंगनवाड़ी केंद्र' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });
});
