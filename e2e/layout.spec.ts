import { type Page } from '@playwright/test';

import { expect, expectNoHorizontalScroll, signIn, test } from './fixtures';

/** Every page, for each kind of user: none may be wider than the screen. */
const PAGES: { account: string | null; paths: string[] }[] = [
  { account: null, paths: ['/home', '/login', '/not-a-page'] },
  {
    account: 'aww@demo.in',
    paths: [
      '/home',
      '/competencies',
      '/competencies/domain/language-and-literacy-development',
      '/competencies/2',
      '/competencies/2/assess',
      '/competencies/10/assess',
      '/students',
      '/students/new',
      '/students/1/edit',
      '/dashboard',
      '/dashboard?view=competencies',
      '/dashboard?view=students',
      '/dashboard?view=attention',
      '/admin',
    ],
  },
  {
    account: 'admin@demo.in',
    paths: [
      '/admin',
      '/admin/users',
      '/admin/users/new',
      '/admin/users/2/edit',
      '/admin/centers',
      '/admin/centers/new',
      '/admin/centers/1/edit',
      '/students',
      '/dashboard',
    ],
  },
  { account: 'supervisor@demo.in', paths: ['/supervisor', '/students', '/students/new'] },
  { account: 'cdpo@demo.in', paths: ['/cdpo'] },
  { account: 'aww3@demo.in', paths: ['/students', '/dashboard'] },
];

/** The demo backend answers inside the page, so wait for the app rather than the network. */
async function settle(page: Page): Promise<void> {
  await expect(page.locator('mat-progress-bar')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('app-skeleton')).toHaveCount(0, { timeout: 15_000 });
}

for (const lang of ['en', 'hi'] as const) {
  test.describe(`layout (${lang})`, () => {
    test.use({ lang });

    for (const { account, paths } of PAGES) {
      test(`${account ?? 'signed-out'} pages fit the screen`, async ({ page }) => {
        if (account) await signIn(page, account);
        for (const path of paths) {
          await page.goto(path);
          await settle(page);
          await test.step(path, () => expectNoHorizontalScroll(page));
        }
      });
    }
  });
}
