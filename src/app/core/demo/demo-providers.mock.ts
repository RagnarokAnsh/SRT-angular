import type { HttpInterceptorFn } from '@angular/common/http';
import type { Type } from '@angular/core';

import { DemoBanner } from './demo-banner';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoAccount } from './demo-fixtures';
import { mockBackendInterceptor } from './mock-backend';

/** Demo mode: API calls are answered in the browser from sample data. */
export const DEMO_MODE = true;
export const demoInterceptors: HttpInterceptorFn[] = [mockBackendInterceptor];
export const demoBanner: Type<unknown> | null = DemoBanner;
export const demoAccounts: readonly DemoAccount[] = DEMO_ACCOUNTS;
export const demoPassword = DEMO_PASSWORD;
