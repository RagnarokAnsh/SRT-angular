import type { RoleName } from '../models/role';

/** When a user has several roles, the first one in this list decides their home page. */
export const ROLE_PRIORITY: readonly RoleName[] = [
  'admin',
  'stateofficial',
  'dpo',
  'cdpo',
  'supervisor',
  'aww',
];

/** Where each role lands after signing in: workers on the home page, everyone else on their dashboard. */
export const ROLE_HOME: Record<RoleName, string> = {
  admin: '/admin',
  stateofficial: '/state',
  dpo: '/dpo',
  cdpo: '/cdpo',
  supervisor: '/supervisor',
  aww: '/home',
};

/** Which roles may open each section of the app. The route guards use this table too. */
export const ROUTE_ROLES = {
  competencies: ['aww', 'admin'],
  students: ['aww', 'admin', 'supervisor'],
  dashboard: ['aww', 'admin'],
  admin: ['admin'],
  state: ['stateofficial'],
  dpo: ['dpo'],
  cdpo: ['cdpo'],
  supervisor: ['supervisor'],
} as const satisfies Record<string, readonly RoleName[]>;

/** True when a user with these roles may open this in-app address (pages without a rule: yes). */
export function canOpen(url: string, roles: readonly RoleName[]): boolean {
  const section = url.split(/[?#]/)[0].split('/').find(Boolean) ?? '';
  const allowed = (ROUTE_ROLES as Record<string, readonly RoleName[]>)[section];
  return !allowed || allowed.some((role) => roles.includes(role));
}

export interface NavItem {
  path: string;
  labelKey: string;
  /** Shorter label for the phone bar and narrow desktops (the full one is still announced). */
  shortLabelKey?: string;
  icon: string;
  /** Only highlight on an exact URL match (for parents of other nav items). */
  exact?: boolean;
}

/** Main navigation per role (top bar on desktop, bottom bar on phones). */
export const ROLE_NAV: Record<RoleName, readonly NavItem[]> = {
  aww: [
    { path: '/home', labelKey: 'nav.home', icon: 'home' },
    {
      path: '/competencies',
      labelKey: 'nav.domains',
      shortLabelKey: 'nav.domainsShort',
      icon: 'domains',
    },
    { path: '/students', labelKey: 'nav.children', icon: 'children' },
    { path: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard' },
  ],
  admin: [
    { path: '/admin', labelKey: 'nav.overview', icon: 'dashboard', exact: true },
    { path: '/admin/users', labelKey: 'nav.users', icon: 'users' },
    { path: '/admin/centers', labelKey: 'nav.centers', icon: 'center' },
    { path: '/students', labelKey: 'nav.children', icon: 'children' },
  ],
  stateofficial: [{ path: '/state', labelKey: 'nav.dashboard', icon: 'dashboard' }],
  dpo: [{ path: '/dpo', labelKey: 'nav.dashboard', icon: 'dashboard' }],
  cdpo: [{ path: '/cdpo', labelKey: 'nav.dashboard', icon: 'dashboard' }],
  supervisor: [
    { path: '/supervisor', labelKey: 'nav.dashboard', icon: 'dashboard' },
    { path: '/students', labelKey: 'nav.children', icon: 'children' },
  ],
};

/**
 * How much of the location each role is tied to (1 country … 5 sector), as the backend
 * expects; workers are also linked to a centre.
 */
export const ROLE_LOCATION_DEPTH: Record<RoleName, number> = {
  admin: 0,
  stateofficial: 2,
  dpo: 3,
  cdpo: 4,
  supervisor: 5,
  aww: 5,
};
