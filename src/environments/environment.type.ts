export interface Environment {
  /** True for production builds. */
  production: boolean;
  /** Base URL of the Laravel API, without a trailing slash. */
  apiUrl: string;
  /** Requests that take longer than this are cancelled and reported as a timeout. */
  requestTimeoutMs: number;
  /** Signed-in users are logged out after this many minutes without any activity. */
  idleTimeoutMinutes: number;
}
