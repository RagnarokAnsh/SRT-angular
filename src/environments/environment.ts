import type { Environment } from './environment.type';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://ready.unilearn.org.in/sribackend/api',
  requestTimeoutMs: 30_000,
  idleTimeoutMinutes: 30,
};
