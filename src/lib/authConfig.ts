import type { PlayerRole } from '@/types/database';

export const authRoutes = {
  login: '/login',
  dashboard: '/dashboard',
  changePassword: '/change-password',
  unauthorized: '/unauthorized',
  adminPrefix: '/admin',
  dashboardPrefix: '/dashboard',
} as const;

export const tempPasswordPolicy = {
  length: 12,
  minLength: 8,
  chars: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',
} as const;

const adminRoles: PlayerRole[] = ['committee', 'admin'];
const dashboardRoles: PlayerRole[] = ['player', 'committee', 'admin'];

export function isAdminRole(role: PlayerRole | null | undefined) {
  return role ? adminRoles.includes(role) : false;
}

export function canAccessDashboard(role: PlayerRole | null | undefined) {
  return role ? dashboardRoles.includes(role) : false;
}

export function isAdminPath(pathname: string) {
  return pathname.startsWith(authRoutes.adminPrefix);
}

export function isDashboardPath(pathname: string) {
  return pathname.startsWith(authRoutes.dashboardPrefix);
}

export type AuthRedirectDecision =
  | { type: 'login'; path: string; nextPath: string }
  | { type: 'change-password'; path: string }
  | { type: 'dashboard'; path: string }
  | { type: 'unauthorized'; path: string }
  | null;

export function getAuthRedirectDecision(params: {
  pathname: string;
  isAuthenticated: boolean;
  role: PlayerRole | null;
  mustChangePassword: boolean;
}): AuthRedirectDecision {
  const { pathname, isAuthenticated, role, mustChangePassword } = params;

  if (!isAuthenticated) {
    return { type: 'login', path: authRoutes.login, nextPath: pathname };
  }

  if (mustChangePassword && pathname !== authRoutes.changePassword) {
    return { type: 'change-password', path: authRoutes.changePassword };
  }

  if (pathname === authRoutes.changePassword && !mustChangePassword) {
    return { type: 'dashboard', path: authRoutes.dashboard };
  }

  if (isAdminPath(pathname) && !isAdminRole(role)) {
    return { type: 'unauthorized', path: authRoutes.unauthorized };
  }

  if (isDashboardPath(pathname) && !canAccessDashboard(role)) {
    return { type: 'unauthorized', path: authRoutes.unauthorized };
  }

  return null;
}
