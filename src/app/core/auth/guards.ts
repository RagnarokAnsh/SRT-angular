import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import type { RoleName } from '../models/role';
import { AuthService } from './auth';
import { SessionStore } from './session';

/** Signed-in users only; others go to login and come back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(SessionStore).isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** The login page is only for signed-out users. */
export const guestGuard: CanActivateFn = () => {
  if (!inject(SessionStore).isAuthenticated()) return true;
  return inject(Router).parseUrl(inject(AuthService).homeUrl());
};

/** Signed-in users with at least one of the given roles. */
export function roleGuard(...allowed: RoleName[]): CanActivateFn {
  return (_route, state) => {
    const session = inject(SessionStore);
    const router = inject(Router);
    if (!session.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    return session.hasAnyRole(...allowed) ? true : router.createUrlTree(['/unauthorized']);
  };
}
