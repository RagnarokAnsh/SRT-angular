import type { Environment } from './environment.type';

/**
 * Demo mode (`npm run start:mock`): every API call is answered in the browser by
 * the mock backend in `src/app/core/demo`, so no server is needed.
 */
export const environment: Environment = {
  production: false,
  apiUrl: 'http://ready.unilearn.org.in/sribackend/api',
  requestTimeoutMs: 30_000,
  idleTimeoutMinutes: 30,
};
