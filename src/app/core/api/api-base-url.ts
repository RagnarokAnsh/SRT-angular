import { InjectionToken } from '@angular/core';

import { environment } from '@env';

/** Base URL of the backend API, without a trailing slash. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl.replace(/\/+$/, ''),
});
