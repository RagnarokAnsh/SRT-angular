import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

export type AppErrorKind =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'validation'
  | 'tooManyRequests'
  | 'server'
  | 'unknown';

/** A failed request, reduced to what the UI needs to show a helpful message. */
export interface AppError {
  kind: AppErrorKind;
  status: number | null;
  /** Translation key of the message to show. */
  messageKey: string;
  /** Message from the server, only kept for 4xx responses meant for users. */
  serverMessage: string | null;
  /** Laravel validation errors (`errors` in a 422 response), keyed by field. */
  fieldErrors: Record<string, string[]>;
}

const MESSAGE_KEYS: Record<AppErrorKind, string> = {
  offline: 'errors.offline',
  network: 'errors.network',
  timeout: 'errors.timeout',
  unauthorized: 'errors.sessionExpired',
  forbidden: 'errors.forbidden',
  notFound: 'errors.notFound',
  conflict: 'errors.conflict',
  validation: 'errors.validation',
  tooManyRequests: 'errors.tooManyRequests',
  server: 'errors.server',
  unknown: 'errors.unknown',
};

const MAX_SERVER_MESSAGE = 300;

function kindForStatus(status: number): AppErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'tooManyRequests';
  if (status >= 500) return 'server';
  return 'unknown';
}

function readServerMessage(body: unknown): string | null {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message !== 'string' || !message.trim()) return null;
  const text = message.trim();
  return text.length > MAX_SERVER_MESSAGE ? `${text.slice(0, MAX_SERVER_MESSAGE)}…` : text;
}

function readFieldErrors(body: unknown): Record<string, string[]> {
  const errors = (body as { errors?: unknown } | null)?.errors;
  if (!errors || typeof errors !== 'object') return {};
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(errors as Record<string, unknown>)) {
    const list = (Array.isArray(messages) ? messages : [messages])
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
      .map((m) => m.slice(0, MAX_SERVER_MESSAGE));
    if (list.length) result[field] = list;
  }
  return result;
}

function make(kind: AppErrorKind, status: number | null, body?: unknown): AppError {
  const keepServerText = status !== null && status >= 400 && status < 500;
  return {
    kind,
    status,
    messageKey: MESSAGE_KEYS[kind],
    serverMessage: keepServerText ? readServerMessage(body) : null,
    fieldErrors: kind === 'validation' ? readFieldErrors(body) : {},
  };
}

export function isAppError(value: unknown): value is AppError {
  return !!value && typeof value === 'object' && 'kind' in value && 'messageKey' in value;
}

/** Turns anything thrown by an HTTP call into an AppError. */
export function toAppError(
  error: unknown,
  online = typeof navigator === 'undefined' || navigator.onLine,
): AppError {
  if (isAppError(error)) return error;
  if (error instanceof TimeoutError) return make('timeout', null);
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return make(online ? 'network' : 'offline', 0);
    return make(kindForStatus(error.status), error.status, error.error);
  }
  return make('unknown', null);
}

/** True for failures that may succeed if simply tried again. */
export function isRetryable(error: AppError): boolean {
  return ['offline', 'network', 'timeout', 'server', 'tooManyRequests', 'unknown'].includes(
    error.kind,
  );
}
