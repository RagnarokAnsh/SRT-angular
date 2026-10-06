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

export const ROLE_HOME: Record<RoleName, string> = {
  admin: '/admin',
  stateofficial: '/state',
  dpo: '/dpo',
  cdpo: '/cdpo',
  supervisor: '/supervisor',
  aww: '/competencies',
};

export interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
  /** Only highlight on an exact URL match (for parents of other nav items). */
  exact?: boolean;
}

/** Main navigation per role (top bar on desktop, bottom bar on phones). */
export const ROLE_NAV: Record<RoleName, readonly NavItem[]> = {
  aww: [
    { path: '/competencies', labelKey: 'nav.competencies', icon: 'domains' },
    { path: '/children', labelKey: 'nav.children', icon: 'children' },
    { path: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard' },
  ],
  admin: [
    { path: '/admin', labelKey: 'nav.overview', icon: 'dashboard', exact: true },
    { path: '/admin/users', labelKey: 'nav.users', icon: 'users' },
    { path: '/admin/centers', labelKey: 'nav.centers', icon: 'center' },
    { path: '/children', labelKey: 'nav.children', icon: 'children' },
  ],
  stateofficial: [{ path: '/state', labelKey: 'nav.home', icon: 'home' }],
  dpo: [{ path: '/dpo', labelKey: 'nav.home', icon: 'home' }],
  cdpo: [{ path: '/cdpo', labelKey: 'nav.home', icon: 'home' }],
  supervisor: [
    { path: '/supervisor', labelKey: 'nav.home', icon: 'home' },
    { path: '/children', labelKey: 'nav.children', icon: 'children' },
  ],
};
