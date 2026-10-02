// Admin icon set, ported from the Hi-Fi v3 design artifact's AIcon/AGrip. One icon per
// admin nav item (events/courses/matches/setup/scores/handicaps/participants/rerounds/
// travel/lodging/invite/reset/username/awards/players/teams) plus small utility icons used
// inside admin tables and dialogs (edit/trash/x/up/down/updown/back/chev/search/check/save/car).

const ADMIN_ICON_PATHS: Record<string, string> = {
  players: '<circle cx="12" cy="9" r="3.5"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>',
  events: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  teams: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
  courses: '<path d="M8 3v15M8 4l9 3-9 3"/><ellipse cx="12" cy="20" rx="7" ry="1.5"/>',
  matches: '<path d="M4 8h6M14 8h6M4 16h6M14 16h6M12 6v12"/>',
  setup: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M16.5 14v6M13.5 17h6"/>',
  scores: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 10h6M9 14h6M10 4V3h4v1"/>',
  handicaps: '<path d="M4 8h16M4 16h16"/><circle cx="9" cy="8" r="2" fill="var(--pc-card)"/><circle cx="15" cy="16" r="2" fill="var(--pc-card)"/>',
  participants: '<circle cx="10" cy="9" r="3"/><path d="M4 19c0-3 2.5-5 6-5M15 16.5l2.2 2.2L21 14.5"/>',
  rerounds: '<path d="M20 12a8 8 0 11-2.5-5.8M20 4v4h-4"/>',
  travel: '<path d="M3 13l3.5-1.5L11 16l-2 3 1 1 4-3 6-7c.6-.7.4-1.7-.3-2.3l-.4-.4c-.6-.6-1.6-.8-2.3-.3l-7 6L7 11l-3 1z"/>',
  lodging: '<path d="M3 19V6M3 15h18v4M21 15v-2.5A2.5 2.5 0 0018.5 10H11v5"/><circle cx="7" cy="11.5" r="1.5"/>',
  invite: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 7l9 6 9-6"/>',
  reset: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  username: '<circle cx="12" cy="12" r="3"/><path d="M15 12v1.5a2.5 2.5 0 005 0V12a8 8 0 10-3.5 6.6"/>',
  awards: '<polygon points="12,3 14.6,9 21,9.5 16,13.8 17.6,20 12,16.7 6.4,20 8,13.8 3,9.5 9.4,9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  up: '<path d="M7 14l5-5 5 5"/>',
  down: '<path d="M7 10l5 5 5-5"/>',
  updown: '<path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  save: '<path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/>',
  car: '<path d="M4 16v-4l2-5h12l2 5v4zM4 16v2M20 16v2M4 12h16"/>',
};

export function AIcon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: size, height: size, display: 'block', flexShrink: 0 }}
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ADMIN_ICON_PATHS[name] || '' }}
    />
  );
}

export function AGrip() {
  return (
    <svg viewBox="0 0 10 16" style={{ width: 10, height: 16, color: 'var(--pc-ink-3)' }} fill="currentColor">
      <circle cx="2" cy="3" r="1.2" />
      <circle cx="8" cy="3" r="1.2" />
      <circle cx="2" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="2" cy="13" r="1.2" />
      <circle cx="8" cy="13" r="1.2" />
    </svg>
  );
}
