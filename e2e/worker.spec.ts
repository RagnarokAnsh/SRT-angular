import { expect, expectAccessible, expectNoHorizontalScroll, signIn, test } from './fixtures';

test.describe('Anganwadi worker', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'aww@demo.in');
  });

  test('lands on the home page, and opens a competency from the domains', async ({ page }) => {
    await expect(page).toHaveURL(/\/home$/);
    await page
      .getByRole('navigation')
      .getByRole('link', { name: /School Readiness – Domains|^Domains$/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/competencies$/);
    await expect(page.getByRole('heading', { name: 'Cognitive Development' })).toBeVisible();
    await page.getByRole('link', { name: /Classification/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Classification' })).toBeVisible();
    await expect(page.getByText('Classifies objects based on three characteristics')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });

  test('assesses two students and sees their new session', async ({ page }) => {
    await page.goto('/competencies/4/assess'); // Number concept: nobody assessed yet
    const rows = page.locator('.child');
    await expect(rows.first()).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('checkbox', { name: /Aarav Kumar/ }).check();
    await page.getByRole('checkbox', { name: /Diya Sharma/ }).check();
    await expect(page.getByText('2 students selected')).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Assessment' }).click();

    await page.getByRole('button', { name: 'Submit Assessment' }).click();
    await expect(page.getByText('Choose a level to continue.')).toBeVisible();

    await page.getByText('Identifies numerals and can link them with concrete objects').click();
    await page.getByLabel('Add remarks for this assessment').fill('Counted blocks to 10.');
    await expectNoHorizontalScroll(page);
    await page.getByRole('button', { name: 'Submit Assessment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit Assessment' }).click();

    await expect(page.getByText('Assessment submitted successfully!')).toBeVisible();
    await expect(
      page.locator('.child', { hasText: 'Aarav Kumar' }).getByText('Next: session 2'),
    ).toBeVisible();
  });

  test('keeps failed results for another try, and saves them once', async ({ page }) => {
    await page.goto('/competencies/4/assess');
    await page.getByRole('checkbox', { name: /Aarav Kumar/ }).check();
    await page.getByRole('button', { name: 'Continue to Assessment' }).click();
    await expect(page.locator('#record-title')).toBeFocused(); // focus follows the step
    await page.getByText('Identifies numerals and can link them with concrete objects').click();

    const serverDown = page.getByRole('switch', { name: 'Simulate server down' });
    await serverDown.click();
    await page.getByRole('button', { name: 'Submit Assessment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit Assessment' }).click();
    await expect(page.getByText("1 result couldn't be saved")).toBeVisible();
    // The list couldn't be refreshed either; the failed student stays ready for another try.
    await expect(page.getByText("Couldn't refresh the list")).toBeVisible();

    await serverDown.click();
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit Assessment' }).click();
    await expect(page.getByText('Assessment submitted successfully!')).toBeVisible();
    const aarav = page.locator('.child', { hasText: 'Aarav Kumar' });
    await expect(aarav.getByText('Next: session 2')).toBeVisible();
  });

  test('records height and weight for gross motor', async ({ page }) => {
    await page.goto('/competencies/10/assess');
    await page.getByRole('checkbox', { name: /Ishaan Verma/ }).check();
    await page.getByRole('button', { name: 'Continue to Assessment' }).click();
    await expect(page.getByRole('heading', { name: 'Height and weight' })).toBeVisible();
    await page.getByText('Maintains balance in gross motor activities').click();
    await page.getByRole('button', { name: 'Submit Assessment' }).click();
    await expect(page.getByText('This field is required.').first()).toBeVisible();

    await page.getByRole('textbox', { name: 'Height' }).fill('93.5');
    await page.getByRole('textbox', { name: 'Weight' }).fill('13.4');
    await page.getByRole('button', { name: 'Submit Assessment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit Assessment' }).click();
    await expect(page.getByText('Assessment submitted successfully!')).toBeVisible();
  });

  test('asks before leaving an unfinished assessment', async ({ page }) => {
    await page.goto('/competencies/4/assess');
    await page.getByRole('checkbox', { name: /Aarav Kumar/ }).check();
    await page.getByRole('link', { name: 'Back to Videos' }).click();
    await expect(page.getByRole('dialog')).toContainText('Leave without saving?');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/assess$/);
  });

  test('adds a student with a Hindi name and warns about duplicates', async ({ page }) => {
    await page.goto('/students/new');
    await page.getByLabel('First Name').fill('प्रिया');
    await page.getByLabel('Last Name').fill('शर्मा');
    await page.getByLabel('Date of birth').fill('2022-05-10');
    await page.getByRole('radio', { name: 'Girl' }).check();
    await page.getByLabel('Home language').fill('हिंदी');
    await page.getByLabel('Symbol').fill('Mango');
    await page.getByRole('textbox', { name: 'Height' }).fill('95.5');
    await page.getByRole('textbox', { name: 'Weight' }).fill('13.2');
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Create Student' }).click();
    await expect(page).toHaveURL(/\/students$/);
    await expect(page.getByRole('listitem').filter({ hasText: 'प्रिया शर्मा' })).toBeVisible();

    await page.goto('/students/new');
    await page.getByLabel('First Name').fill('प्रिया ');
    await page.getByLabel('Last Name').fill('  शर्मा');
    await page.getByLabel('Date of birth').fill('2022-05-10');
    await page.getByRole('radio', { name: 'Girl' }).check();
    await page.getByLabel('Home language').fill('हिंदी');
    await page.getByLabel('Symbol').fill('Leaf');
    await page.getByRole('textbox', { name: 'Height' }).fill('95');
    await page.getByRole('textbox', { name: 'Weight' }).fill('13');
    await page.getByRole('button', { name: 'Create Student' }).click();
    await expect(page.getByRole('dialog')).toContainText('This student may already be registered');
  });

  test('rejects impossible student details', async ({ page }) => {
    await page.goto('/students/new');
    await page.getByLabel('First Name').fill('R2D2');
    await page.getByLabel('Date of birth').fill('2010-01-01');
    await page.getByRole('textbox', { name: 'Height' }).fill('500');
    await page.getByRole('button', { name: 'Create Student' }).click();
    await expect(page.getByText("Use letters, spaces and . ' - only.")).toBeVisible();
    await expect(page.getByText('The child must be between 2 and 6 years old.')).toBeVisible();
    await expect(page.getByText('Enter a value from 30 to 200.')).toBeVisible();
  });

  test('edits a student with the first and last name apart', async ({ page }) => {
    await page.goto('/students/1/edit');
    await expect(page.getByLabel('First Name')).toHaveValue('Aarav');
    await expect(page.getByLabel('Last Name')).toHaveValue('Kumar');
    await page.getByLabel('Last Name').fill('Kumar Singh');
    await page.getByRole('button', { name: 'Update Student' }).click();
    await expect(page).toHaveURL(/\/students$/);
    await expect(page.getByRole('listitem').filter({ hasText: 'Aarav Kumar Singh' })).toBeVisible();
  });
});
