import { getAllPlayersAndMatches } from '@/lib/getAllPlayersAndMatches';
import { getMatchesWithPlayers } from '@/lib/getMatchesWithPlayers';
import { getPlayerRecord } from '@/lib/getPlayerRecord';

jest.mock('@/lib/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const supabaseMock = jest.requireMock('@/lib/supabaseClient').supabase;

describe('bandon legacy helpers', () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
  });

  it('returns matches and players', async () => {
    supabaseMock.from.mockImplementation((table: string) => ({
      select: () =>
        table === 'match_bandon'
          ? { data: [{ id: 'm1' }], error: null }
          : { data: [{ id: 'p1' }], error: null },
    }));

    const result = await getAllPlayersAndMatches();

    expect(result.matches).toHaveLength(1);
    expect(result.players).toHaveLength(1);
  });

  it('maps matches to player objects', async () => {
    supabaseMock.from.mockImplementation((table: string) => ({
      select: () =>
        table === 'match_bandon'
          ? {
              data: [
                {
                  id: 'm1',
                  thompson_player1: 'p1',
                  thompson_player2: null,
                  burgess_player1: 'p2',
                  burgess_player2: null,
                },
              ],
              error: null,
            }
          : { data: [{ id: 'p1' }, { id: 'p2' }], error: null },
    }));

    const matches = await getMatchesWithPlayers();

    expect(matches[0].thompson_player1).toEqual({ id: 'p1' });
    expect(matches[0].burgess_player1).toEqual({ id: 'p2' });
  });

  it('returns player record or null', async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'player') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'player-1' }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'records_bandon') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { wins: 1, losses: 2, ties: 3 },
                  error: null,
                }),
            }),
          }),
        };
      }

      return { select: () => ({ data: null, error: null }) };
    });

    const record = await getPlayerRecord('James', 'Thompson');

    expect(record).toEqual({ wins: 1, losses: 2, ties: 3 });
  });

  it('returns null when record lookup fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'player') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'player-1' }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'records_bandon') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: new Error('missing') }),
            }),
          }),
        };
      }

      return { select: () => ({ data: null, error: null }) };
    });

    const record = await getPlayerRecord('James', 'Thompson');

    expect(record).toBeNull();
    consoleError.mockRestore();
  });
});
