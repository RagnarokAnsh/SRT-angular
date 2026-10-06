import { expect, expectAccessible, expectNoHorizontalScroll, signIn, test } from './fixtures';

test.describe('Anganwadi worker', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'aww@demo.in');
  });

  test('lands on the competencies and can open one', async ({ page }) => {
    await expect(page).toHaveURL(/\/competencies$/);
    await expect(page.getByRole('heading', { name: 'Cognitive Development' })).toBeVisible();
    await page.getByRole('link', { name: /Classification/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Classification' })).toBeVisible();
    await expect(page.getByText('Classifies objects based on three characteristics')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });

  test('assesses two children and sees their new session', async ({ page }) => {
    await page.goto('/competencies/3/assess'); // Number Concept: nobody assessed yet
    const rows = page.locator('.child');
    await expect(rows.first()).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('checkbox', { name: /Aarav Kumar/ }).check();
    await page.getByRole('checkbox', { name: /Diya Sharma/ }).check();
    await expect(page.getByText('2 children selected')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('button', { name: 'Save assessment' }).click();
    await expect(page.getByText('Choose a level to continue.')).toBeVisible();

    await page.getByText('Identifies numerals and can link them with concrete objects').click();
    await page.getByLabel('What did you notice?').fill('Counted blocks to 10.');
    await expectNoHorizontalScroll(page);
    await page.getByRole('button', { name: 'Save assessment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save assessment' }).click();

    await expect(page.getByText('Assessment saved for 2 children.')).toBeVisible();
    await expect(
      page.locator('.child', { hasText: 'Aarav Kumar' }).getByText('Next: session 2'),
    ).toBeVisible();
  });

  test('records height and weight for gross motor', async ({ page }) => {
    await page.goto('/competencies/10/assess');
    await page.getByRole('checkbox', { name: /Ishaan Verma/ }).check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Height and weight' })).toBeVisible();
    await page.getByText('Maintains balance in gross motor activities').click();
    await page.getByRole('button', { name: 'Save assessment' }).click();
    await expect(page.getByText('This field is required.').first()).toBeVisible();

    await page.getByRole('textbox', { name: 'Height' }).fill('93.5');
    await page.getByRole('textbox', { name: 'Weight' }).fill('13.4');
    await page.getByRole('button', { name: 'Save assessment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save assessment' }).click();
    await expect(page.getByText('Assessment saved for 1 child.')).toBeVisible();
  });

  test('asks before leaving an unfinished assessment', async ({ page }) => {
    await page.goto('/competencies/3/assess');
    await page.getByRole('checkbox', { name: /Aarav Kumar/ }).check();
    await page.getByRole('link', { name: 'Back to the competency' }).click();
    await expect(page.getByRole('dialog')).toContainText('Leave without saving?');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/assess$/);
  });

  test('adds a child with a Hindi name and warns about duplicates', async ({ page }) => {
    await page.goto('/children/new');
    await page.getByLabel('Full name').fill('प्रिया शर्मा');
    await page.getByLabel('Date of birth').fill('2022-05-10');
    await page.getByRole('radio', { name: 'Girl' }).check();
    await page.getByLabel('Home language').fill('हिंदी');
    await page.getByLabel('Symbol').fill('Mango');
    await page.getByRole('textbox', { name: 'Height' }).fill('95.5');
    await page.getByRole('textbox', { name: 'Weight' }).fill('13.2');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Add child' }).click();
    await expect(page).toHaveURL(/\/children$/);
    await expect(page.getByRole('listitem').filter({ hasText: 'प्रिया शर्मा' })).toBeVisible();

    await page.goto('/children/new');
    await page.getByLabel('Full name').fill('प्रिया  शर्मा');
    await page.getByLabel('Date of birth').fill('2022-05-10');
    await page.getByRole('radio', { name: 'Girl' }).check();
    await page.getByLabel('Home language').fill('हिंदी');
    await page.getByLabel('Symbol').fill('Leaf');
    await page.getByRole('textbox', { name: 'Height' }).fill('95');
    await page.getByRole('textbox', { name: 'Weight' }).fill('13');
    await page.getByRole('button', { name: 'Add child' }).click();
    await expect(page.getByRole('dialog')).toContainText('This child may already be registered');
  });

  test('rejects impossible child details', async ({ page }) => {
    await page.goto('/children/new');
    await page.getByLabel('Full name').fill('R2D2');
    await page.getByLabel('Date of birth').fill('2010-01-01');
    await page.getByRole('textbox', { name: 'Height' }).fill('500');
    await page.getByRole('button', { name: 'Add child' }).click();
    await expect(page.getByText("Use letters, spaces and . ' - only.")).toBeVisible();
    await expect(page.getByText('The child must be between 2 and 6 years old.')).toBeVisible();
    await expect(page.getByText('Enter a value from 30 to 200.')).toBeVisible();
  });
});
