import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '@core/api/api-base-url';

export const TEST_API = 'https://api.test/api';

/** TestBed with a mocked HttpClient and a fixed API base URL. */
export function setupHttpTesting(extraProviders: unknown[] = []): HttpTestingController {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: TEST_API },
      ...(extraProviders as never[]),
    ],
  });
  return TestBed.inject(HttpTestingController);
}
