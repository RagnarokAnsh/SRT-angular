import type { HttpInterceptorFn } from '@angular/common/http';
import type { Type } from '@angular/core';

import type { DemoAccount } from './demo-fixtures';

/**
 * Normal builds: no demo backend. `ng serve --configuration mock` (npm run start:mock)
 * replaces this file with demo-providers.mock.ts, so demo code never reaches production.
 */
export const DEMO_MODE = false;
export const demoInterceptors: HttpInterceptorFn[] = [];
export const demoBanner: Type<unknown> | null = null;
export const demoAccounts: readonly DemoAccount[] = [];
export const demoPassword = '';
