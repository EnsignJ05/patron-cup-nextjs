/**
 * Admin nav taxonomy, from the Hi-Fi v3 design artifact's AD_GROUPS. Shared between the
 * admin sidebar (src/app/layout.tsx) and the admin dashboard hub (src/app/admin/dashboard)
 * so the grouping is defined once, not duplicated.
 */
export type AdminNavItem = {
  /** Icon name, matches a key in AdminIcons' AIcon. */
  icon: string;
  label: string;
  description: string;
  href: string;
};

export type AdminNavGroup = {
  name: string;
  /** CSS color value (a --pc-* token reference) for the group's accent dot/icon tint. */
  color: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    name: 'Competition',
    color: 'var(--pc-team-b)',
    items: [
      { icon: 'events', label: 'Events', description: 'Create and schedule cups', href: '/admin/events' },
      { icon: 'courses', label: 'Courses', description: 'Venues, par and slope', href: '/admin/courses' },
      { icon: 'matches', label: 'Matches', description: 'Pairings and results', href: '/admin/matches' },
      { icon: 'setup', label: 'Match Setup', description: 'Groups and tee times', href: '/admin/matches/setup' },
      { icon: 'scores', label: 'Scores', description: 'Review and confirm', href: '/admin/scores' },
      { icon: 'handicaps', label: 'Handicaps', description: 'Indexes and adjustments', href: '/admin/handicaps' },
      { icon: 'rerounds', label: 'Re-rounds', description: 'Make-up rounds', href: '/admin/rerounds' },
      { icon: 'awards', label: 'Award Nominations', description: 'Review nominees', href: '/admin/award-nominations' },
    ],
  },
  {
    name: 'People',
    color: 'var(--pc-team-a)',
    items: [
      { icon: 'players', label: 'Players', description: 'Profiles and roles', href: '/admin/players' },
      { icon: 'teams', label: 'Teams', description: 'Rosters and captains', href: '/admin/teams' },
      { icon: 'participants', label: 'Participants', description: 'Who is in each event', href: '/admin/participants' },
    ],
  },
  {
    name: 'Trip',
    color: 'var(--pc-live-dot)',
    items: [
      { icon: 'travel', label: 'Travel', description: 'Flights and arrivals', href: '/admin/travel' },
      { icon: 'lodging', label: 'Lodging', description: 'Rooms and roommates', href: '/admin/lodging' },
    ],
  },
  {
    name: 'Accounts',
    color: 'var(--pc-ink-3)',
    items: [
      { icon: 'invite', label: 'Invite Player', description: 'Send a signup link', href: '/admin/invite' },
      { icon: 'reset', label: 'Reset Password', description: 'Issue a temporary one', href: '/admin/reset-password' },
      { icon: 'username', label: 'Change Username', description: 'Rename an account', href: '/admin/change-username' },
    ],
  },
];
