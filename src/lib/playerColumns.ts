import type { Player } from '@/types/database';

/**
 * Columns `anon` is granted SELECT on for public.players (see
 * supabase/migrations/20260927120000_players_pii_column_grants.sql).
 * Must stay in sync with that grant: a column here but not in the grant 403s for
 * anonymous visitors; a column in the grant but not here is needlessly exposed.
 */
export const PUBLIC_PLAYER_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'current_handicap',
  'ghin_club',
  'city',
  'state',
  'profile_image_url',
  'is_active',
] as const;

export type PublicPlayerColumn = (typeof PUBLIC_PLAYER_COLUMNS)[number];

export type PublicPlayer = Pick<Player, PublicPlayerColumn>;

/** PostgREST `select=` string, e.g. for `.select(PUBLIC_PLAYER_SELECT)`. */
export const PUBLIC_PLAYER_SELECT = PUBLIC_PLAYER_COLUMNS.join(', ');

/** Same list shaped for a nested embed, e.g. `player:players(${PUBLIC_PLAYER_EMBED})`. */
export const PUBLIC_PLAYER_EMBED = PUBLIC_PLAYER_COLUMNS.join(',');
