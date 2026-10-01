import { PUBLIC_PLAYER_COLUMNS, PUBLIC_PLAYER_SELECT, type PublicPlayer } from '@/lib/playerColumns';

// This is the guard that fails if someone "fixes" a missing field by widening the public
// list instead of removing the rendering that needed it. See TEST_ENVIRONMENT_PLAN.md
// Part II, Task S2/S4 -- this list must stay in sync with the anon column GRANT.
const FORBIDDEN = [
  'email',
  'phone',
  'address_line1',
  'address_line2',
  'zip_code',
  'ghin_number',
  'shirt_size',
  'dietary_restrictions',
  'emergency_contact_name',
  'emergency_contact_phone',
  'role',
  'auth_user_id',
] as const;

describe('PUBLIC_PLAYER_COLUMNS', () => {
  it.each(FORBIDDEN)('never exposes %s to anonymous visitors', (column) => {
    expect(PUBLIC_PLAYER_COLUMNS).not.toContain(column);
  });

  it('keeps the columns public pages filter and sort on', () => {
    // .eq('status', ...) and .order('last_name') need SELECT privilege on those columns.
    expect(PUBLIC_PLAYER_COLUMNS).toContain('status');
    expect(PUBLIC_PLAYER_COLUMNS).toContain('last_name');
  });

  it('builds a PostgREST select string without a wildcard', () => {
    expect(PUBLIC_PLAYER_SELECT).not.toContain('*');
    expect(PUBLIC_PLAYER_SELECT.split(', ')).toEqual([...PUBLIC_PLAYER_COLUMNS]);
  });
});

describe('PublicPlayer type', () => {
  it('has no PII fields at the type level', () => {
    // @ts-expect-error - PublicPlayer must not carry email
    const _noEmail: keyof PublicPlayer = 'email';
    // @ts-expect-error - PublicPlayer must not carry phone
    const _noPhone: keyof PublicPlayer = 'phone';
    void _noEmail;
    void _noPhone;
  });
});
