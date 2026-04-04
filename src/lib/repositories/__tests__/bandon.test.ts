import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchBandonMatchesAndPlayers,
  fetchBandonMatchesWithPlayers,
  fetchBandonPlayerRecordByName,
} from '@/lib/repositories/bandon';

function buildSupabaseMock(options: {
  matches?: any[];
  players?: any[];
  playerId?: string;
  record?: { wins: number | null; losses: number | null; ties: number | null } | null;
  matchError?: Error | null;
  playerError?: Error | null;
  recordError?: Error | null;
  playerSelectReturnsList?: boolean;
  /** When true, player .single() returns { data: null, error: null } */
  playerLookupEmpty?: boolean;
}) {
  const {
    playerId = 'player-1',
    record = { wins: 1, losses: 2, ties: 0 },
    matchError,
    playerError,
    recordError,
    playerSelectReturnsList = false,
    playerLookupEmpty = false,
  } = options;

  const matches = Object.prototype.hasOwnProperty.call(options, 'matches') ? options.matches : [];
  const players = Object.prototype.hasOwnProperty.call(options, 'players') ? options.players : [];

  return {
    from: (table: string) => ({
      select: () => {
        if (table === 'match_bandon') {
          return { data: matches, error: matchError ?? null };
        }

        if (table === 'player') {
          if (playerSelectReturnsList) {
            return { data: players, error: playerError ?? null };
          }

          return {
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: playerLookupEmpty ? null : playerError ? null : { id: playerId },
                    error: playerError ?? null,
                  }),
              }),
            }),
          };
        }

        if (table === 'records_bandon') {
          return {
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: recordError ? null : record,
                  error: recordError ?? null,
                }),
            }),
          };
        }

        return { data: players, error: playerError ?? null };
      },
    }),
  } as unknown as SupabaseClient;
}

describe('bandon repository', () => {
  it('fetches matches and players', async () => {
    const supabase = buildSupabaseMock({
      matches: [{ id: 'm1' }],
      players: [{ id: 'p1' }],
      playerSelectReturnsList: true,
    });

    const result = await fetchBandonMatchesAndPlayers(supabase);

    expect(result.matches).toHaveLength(1);
    expect(result.players).toHaveLength(1);
  });

  it('handles missing match/player data arrays', async () => {
    const supabase = buildSupabaseMock({
      matches: undefined,
      players: undefined,
      playerSelectReturnsList: true,
    });

    const result = await fetchBandonMatchesAndPlayers(supabase);

    expect(result.matches).toEqual([]);
    expect(result.players).toEqual([]);
  });

  it('maps matches with player objects', async () => {
    const supabase = buildSupabaseMock({
      matches: [
        {
          id: 'm1',
          thompson_player1: 'p1',
          thompson_player2: null,
          burgess_player1: 'p2',
          burgess_player2: null,
        },
      ],
      players: [
        { id: 'p1', name: 'Player One' },
        { id: 'p2', name: 'Player Two' },
      ],
      playerSelectReturnsList: true,
    });

    const matches = await fetchBandonMatchesWithPlayers(supabase);

    expect(matches[0].thompson_player1?.name).toBe('Player One');
    expect(matches[0].burgess_player1?.name).toBe('Player Two');
  });

  it('sets missing players to null in match mapping', async () => {
    const supabase = buildSupabaseMock({
      matches: [
        {
          id: 'm2',
          thompson_player1: 'p1',
          thompson_player2: 'missing',
          burgess_player1: null,
          burgess_player2: 'missing',
        },
      ],
      players: [{ id: 'p1', name: 'Player One' }],
      playerSelectReturnsList: true,
    });

    const matches = await fetchBandonMatchesWithPlayers(supabase);

    expect(matches[0].thompson_player2).toBeNull();
    expect(matches[0].burgess_player2).toBeNull();
  });

  it('returns player record data', async () => {
    const supabase = buildSupabaseMock({
      record: { wins: 2, losses: 1, ties: 1 },
    });

    const result = await fetchBandonPlayerRecordByName(supabase, 'James', 'Thompson');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ wins: 2, losses: 1, ties: 1 });
  });

  it('returns error when player record is missing', async () => {
    const supabase = buildSupabaseMock({
      record: null,
      recordError: null,
    });

    const result = await fetchBandonPlayerRecordByName(supabase, 'James', 'Thompson');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('throws when match query fails', async () => {
    const supabase = buildSupabaseMock({
      matchError: new Error('match failed'),
      playerSelectReturnsList: true,
    });

    await expect(fetchBandonMatchesAndPlayers(supabase)).rejects.toThrow('match failed');
  });

  it('throws when player query fails', async () => {
    const supabase = buildSupabaseMock({
      playerError: new Error('player failed'),
      playerSelectReturnsList: true,
    });

    await expect(fetchBandonMatchesAndPlayers(supabase)).rejects.toThrow('player failed');
  });

  it('throws when player query fails in fetchBandonMatchesWithPlayers', async () => {
    const supabase = buildSupabaseMock({
      matches: [],
      playerError: new Error('player failed'),
      playerSelectReturnsList: true,
    });

    await expect(fetchBandonMatchesWithPlayers(supabase)).rejects.toThrow('player failed');
  });

  it('coalesces null record stats to zero', async () => {
    const supabase = buildSupabaseMock({
      record: { wins: null, losses: null, ties: null },
    });

    const result = await fetchBandonPlayerRecordByName(supabase, 'James', 'Thompson');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ wins: 0, losses: 0, ties: 0 });
  });

  it('returns error when player row is missing without db error', async () => {
    const supabase = buildSupabaseMock({
      playerLookupEmpty: true,
    });

    const result = await fetchBandonPlayerRecordByName(supabase, 'Ghost', 'User');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Player not found');
  });

  it('returns error when player lookup fails', async () => {
    const supabase = buildSupabaseMock({
      playerError: new Error('player missing'),
    });

    const result = await fetchBandonPlayerRecordByName(supabase, 'James', 'Thompson');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});
