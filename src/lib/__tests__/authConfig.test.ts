import {
  authRoutes,
  canAccessDashboard,
  getAuthRedirectDecision,
  isAdminPath,
  isAdminRole,
  isDashboardPath,
} from '@/lib/authConfig';

describe('getAuthRedirectDecision', () => {
  it('redirects unauthenticated users to login with next path', () => {
    const decision = getAuthRedirectDecision({
      pathname: '/admin/dashboard',
      isAuthenticated: false,
      role: null,
      mustChangePassword: false,
    });

    expect(decision).toEqual({
      type: 'login',
      path: authRoutes.login,
      nextPath: '/admin/dashboard',
    });
  });

  it('forces password change when required', () => {
    const decision = getAuthRedirectDecision({
      pathname: '/dashboard',
      isAuthenticated: true,
      role: 'player',
      mustChangePassword: true,
    });

    expect(decision).toEqual({
      type: 'change-password',
      path: authRoutes.changePassword,
    });
  });

  it('redirects away from change-password when not required', () => {
    const decision = getAuthRedirectDecision({
      pathname: authRoutes.changePassword,
      isAuthenticated: true,
      role: 'player',
      mustChangePassword: false,
    });

    expect(decision).toEqual({
      type: 'dashboard',
      path: authRoutes.dashboard,
    });
  });

  it('blocks non-admin users from admin routes', () => {
    const decision = getAuthRedirectDecision({
      pathname: '/admin/players',
      isAuthenticated: true,
      role: 'player',
      mustChangePassword: false,
    });

    expect(decision).toEqual({
      type: 'unauthorized',
      path: authRoutes.unauthorized,
    });
  });

  it('allows authorized dashboard access', () => {
    const decision = getAuthRedirectDecision({
      pathname: '/dashboard',
      isAuthenticated: true,
      role: 'committee',
      mustChangePassword: false,
    });

    expect(decision).toBeNull();
  });

  it('evaluates role and path helpers', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('player')).toBe(false);
    expect(canAccessDashboard('player')).toBe(true);
    expect(canAccessDashboard(null)).toBe(false);
    expect(isAdminPath('/admin/teams')).toBe(true);
    expect(isDashboardPath('/dashboard')).toBe(true);
  });
});
