import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

import { isRetryable, toAppError } from './app-error';

const http = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('toAppError', () => {
  it('tells offline from an unreachable server', () => {
    expect(toAppError(http(0), false).kind).toBe('offline');
    expect(toAppError(http(0), true).kind).toBe('network');
  });

  it('maps timeouts and HTTP statuses', () => {
    expect(toAppError(new TimeoutError()).kind).toBe('timeout');
    expect(toAppError(http(401)).kind).toBe('unauthorized');
    expect(toAppError(http(403)).kind).toBe('forbidden');
    expect(toAppError(http(404)).kind).toBe('notFound');
    expect(toAppError(http(409)).kind).toBe('conflict');
    expect(toAppError(http(422)).kind).toBe('validation');
    expect(toAppError(http(429)).kind).toBe('tooManyRequests');
    expect(toAppError(http(503)).kind).toBe('server');
    expect(toAppError(new Error('boom')).kind).toBe('unknown');
  });

  it('keeps the server message for client errors only, shortened', () => {
    expect(toAppError(http(400, { message: 'Bad thing' })).serverMessage).toBe('Bad thing');
    expect(
      toAppError(http(500, { message: 'SQLSTATE[42S22] secret details' })).serverMessage,
    ).toBeNull();
    const long = toAppError(http(400, { message: 'x'.repeat(500) })).serverMessage ?? '';
    expect(long.length).toBeLessThanOrEqual(301);
  });

  it('reads Laravel validation errors', () => {
    const error = toAppError(
      http(422, {
        message: 'Invalid',
        errors: { email: ['Taken.'], name: 'Required.', bad: [42] },
      }),
    );
    expect(error.fieldErrors).toEqual({ email: ['Taken.'], name: ['Required.'] });
    expect(error.messageKey).toBe('errors.validation');
  });

  it('knows which failures are worth retrying', () => {
    expect(isRetryable(toAppError(http(0)))).toBe(true);
    expect(isRetryable(toAppError(http(503)))).toBe(true);
    expect(isRetryable(toAppError(http(403)))).toBe(false);
    expect(isRetryable(toAppError(http(422)))).toBe(false);
  });
});
