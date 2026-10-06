import { inject } from '@angular/core';
import type { Routes } from '@angular/router';

import { AuthService } from '@core/auth/auth';
import { guestGuard } from '@core/auth/guards';
import { SessionStore } from '@core/auth/session';

/** Route `title`s are translation keys (see TranslatedTitleStrategy). */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => (inject(SessionStore).isAuthenticated() ? inject(AuthService).homeUrl() : '/home'),
  },
  {
    path: 'home',
    title: 'home.pageTitle',
    loadComponent: () => import('./features/public/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'login',
    title: 'login.pageTitle',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/public/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'unauthorized',
    title: 'unauthorized.pageTitle',
    loadComponent: () =>
      import('./features/public/unauthorized-page').then((m) => m.UnauthorizedPage),
  },

  // Addresses used by the previous version, so bookmarks keep working.
  { path: 'select-competency', redirectTo: 'competencies' },
  { path: 'details/:id', redirectTo: 'competencies/:id' },
  { path: 'assessments/:id', redirectTo: 'competencies/:id/assess' },
  { path: 'aww/assessments/:id', redirectTo: 'competencies/:id/assess' },
  { path: 'assessments', redirectTo: 'competencies' },
  { path: 'aww', redirectTo: 'dashboard' },
  { path: 'aww/dashboard', redirectTo: 'dashboard' },
  { path: 'students', redirectTo: 'children' },
  { path: 'students/create', redirectTo: 'children/new' },
  { path: 'students/edit/:id', redirectTo: 'children/:id/edit' },
  { path: 'admin/dashboard', redirectTo: 'admin' },
  { path: 'admin/anganwadi', redirectTo: 'admin/centers' },
  { path: 'admin/anganwadi/create', redirectTo: 'admin/centers/new' },
  { path: 'admin/anganwadi/edit/:id', redirectTo: 'admin/centers/:id/edit' },
  { path: 'admin/users/create', redirectTo: 'admin/users/new' },
  { path: 'admin/users/edit/:id', redirectTo: 'admin/users/:id/edit' },
  { path: 'state/dashboard', redirectTo: 'state' },
  { path: 'dpo/dashboard', redirectTo: 'dpo' },
  { path: 'cdpo/dashboard', redirectTo: 'cdpo' },
  { path: 'supervisor/dashboard', redirectTo: 'supervisor' },
  { path: '404', redirectTo: 'not-found' },

  {
    path: '**',
    title: 'notFound.pageTitle',
    loadComponent: () => import('./features/public/not-found-page').then((m) => m.NotFoundPage),
  },
];
