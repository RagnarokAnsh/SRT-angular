import { inject } from '@angular/core';
import type { Routes } from '@angular/router';

import { AuthService } from '@core/auth/auth';
import { guestGuard, roleGuard } from '@core/auth/guards';
import { ROUTE_ROLES } from '@core/auth/roles';
import { SessionStore } from '@core/auth/session';
import { unsavedChangesGuard } from '@shared/unsaved-changes-guard';

import { competencyBySlug } from './features/competencies/competency-by-slug';

/** Route `title`s are translation keys (see TranslatedTitleStrategy). */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () =>
      inject(SessionStore).isAuthenticated() ? inject(AuthService).homeUrl() : '/home',
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
  { path: 'select-competency', pathMatch: 'full', redirectTo: 'competencies' },
  { path: 'details/:id', pathMatch: 'full', redirectTo: 'competencies/:id' },
  { path: 'assessments/:id', pathMatch: 'full', redirectTo: 'competencies/:id/assess' },
  { path: 'aww/assessments/:id', pathMatch: 'full', redirectTo: 'competencies/:id/assess' },
  { path: 'assessments', pathMatch: 'full', redirectTo: 'competencies' },
  { path: 'aww', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'aww/dashboard', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'students/create', pathMatch: 'full', redirectTo: 'students/new' },
  { path: 'students/edit/:id', pathMatch: 'full', redirectTo: 'students/:id/edit' },
  { path: 'admin/dashboard', pathMatch: 'full', redirectTo: 'admin' },
  { path: 'admin/anganwadi', pathMatch: 'full', redirectTo: 'admin/centers' },
  { path: 'admin/anganwadi/create', pathMatch: 'full', redirectTo: 'admin/centers/new' },
  { path: 'admin/anganwadi/edit/:id', pathMatch: 'full', redirectTo: 'admin/centers/:id/edit' },
  { path: 'admin/users/create', pathMatch: 'full', redirectTo: 'admin/users/new' },
  { path: 'admin/users/edit/:id', pathMatch: 'full', redirectTo: 'admin/users/:id/edit' },
  { path: 'state/dashboard', pathMatch: 'full', redirectTo: 'state' },
  { path: 'dpo/dashboard', pathMatch: 'full', redirectTo: 'dpo' },
  { path: 'cdpo/dashboard', pathMatch: 'full', redirectTo: 'cdpo' },
  { path: 'supervisor/dashboard', pathMatch: 'full', redirectTo: 'supervisor' },
  { path: '404', pathMatch: 'full', redirectTo: 'not-found' },

  // Anganwadi workers (administrators can use these too, as before).
  // "School Readiness – Domains": all domains, one domain, one competency.
  {
    path: 'competencies',
    canActivate: [roleGuard(...ROUTE_ROLES.competencies)],
    children: [
      {
        path: '',
        title: 'competencies.title',
        loadComponent: () =>
          import('./features/competencies/competency-list-page').then((m) => m.CompetencyListPage),
      },
      {
        path: 'domain/:slug',
        title: 'domainPage.pageTitle',
        loadComponent: () =>
          import('./features/competencies/domain-page').then((m) => m.DomainPage),
      },
      {
        // The home page's wheel names competencies, not ids: this opens the right page.
        path: 'find/:slug',
        canActivate: [competencyBySlug],
        children: [],
      },
      {
        path: ':id',
        title: 'competencyDetail.pageTitle',
        loadComponent: () =>
          import('./features/competencies/competency-detail-page').then(
            (m) => m.CompetencyDetailPage,
          ),
      },
      {
        path: ':id/assess',
        title: 'assessment.pageTitle',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/competencies/assessment/assessment-page').then(
            (m) => m.AssessmentPage,
          ),
      },
    ],
  },
  // Students are "children" in the API (/children, child_id), so the code uses that name.
  {
    path: 'students',
    canActivate: [roleGuard(...ROUTE_ROLES.students)],
    children: [
      {
        path: '',
        title: 'children.title',
        loadComponent: () =>
          import('./features/children/child-list-page').then((m) => m.ChildListPage),
      },
      {
        path: 'new',
        title: 'childForm.addTitle',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/children/child-form-page').then((m) => m.ChildFormPage),
      },
      {
        path: ':id/edit',
        title: 'childForm.editTitle',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/children/child-form-page').then((m) => m.ChildFormPage),
      },
    ],
  },

  {
    path: 'dashboard',
    title: 'dashboard.title',
    canActivate: [roleGuard(...ROUTE_ROLES.dashboard)],
    loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },

  {
    path: 'admin',
    canActivate: [roleGuard(...ROUTE_ROLES.admin)],
    children: [
      {
        path: '',
        title: 'admin.overview.title',
        loadComponent: () =>
          import('./features/admin/admin-overview-page').then((m) => m.AdminOverviewPage),
      },
      {
        path: 'users',
        title: 'admin.users.title',
        loadComponent: () =>
          import('./features/admin/users/user-list-page').then((m) => m.UserListPage),
      },
      {
        path: 'users/new',
        title: 'admin.users.addTitle',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/admin/users/user-form-page').then((m) => m.UserFormPage),
      },
      {
        path: 'users/:id/edit',
        title: 'admin.users.editTitle',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/admin/users/user-form-page').then((m) => m.UserFormPage),
      },
      {
        path: 'centers',
        title: 'admin.centers.title',
        loadComponent: () =>
          import('./features/admin/centers/center-list-page').then((m) => m.CenterListPage),
      },
      {
        path: 'centers/new',
        title: 'admin.centers.addTitle',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/admin/centers/center-form-page').then((m) => m.CenterFormPage),
      },
      {
        path: 'centers/:id/edit',
        title: 'admin.centers.editTitle',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/admin/centers/center-form-page').then((m) => m.CenterFormPage),
      },
    ],
  },
  ...(['state', 'dpo', 'cdpo', 'supervisor'] as const).map((path) => ({
    path,
    title: 'officials.pageTitle',
    canActivate: [roleGuard(...ROUTE_ROLES[path])],
    loadComponent: () =>
      import('./features/officials/official-home-page').then((m) => m.OfficialHomePage),
  })),

  {
    path: '**',
    title: 'notFound.pageTitle',
    loadComponent: () => import('./features/public/not-found-page').then((m) => m.NotFoundPage),
  },
];
