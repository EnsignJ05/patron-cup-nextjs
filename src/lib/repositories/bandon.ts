import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchBandonMatchesAndPlayers(supabase: SupabaseClient) {
  const [matchRes, playerRes] = await Promise.all([
    supabase.from('match_bandon').select('*'),
    supabase.from('player').select('id, f_name, l_name, handicap'),
  ]);

  if (matchRes.error) throw new Error(matchRes.error.message);
  if (playerRes.error) throw new Error(playerRes.error.message);

  return {
    matches: matchRes.data || [],
    players: playerRes.data || [],
  };
}

export async function fetchBandonMatchesWithPlayers(supabase: SupabaseClient) {
  const [matchRes, playerRes] = await Promise.all([
    supabase.from('match_bandon').select('*'),
    supabase.from('player').select('id, f_name, l_name, handicap'),
  ]);

  if (matchRes.error) throw new Error(matchRes.error.message);
  if (playerRes.error) throw new Error(playerRes.error.message);

  const players = playerRes.data || [];
  const playerMap = new Map(players.map((player) => [player.id, player]));

  return (matchRes.data || []).map((match: any) => ({
    ...match,
    thompson_player1: playerMap.get(match.thompson_player1) || null,
    thompson_player2: playerMap.get(match.thompson_player2) || null,
    burgess_player1: playerMap.get(match.burgess_player1) || null,
    burgess_player2: playerMap.get(match.burgess_player2) || null,
  }));
}

export async function fetchBandonPlayerRecordByName(
  supabase: SupabaseClient,
  firstName: string,
  lastName: string,
) {
  const { data: player, error: playerError } = await supabase
    .from('player')
    .select('id')
    .eq('f_name', firstName)
    .eq('l_name', lastName)
    .single();

  if (playerError || !player) {
    return { data: null, error: playerError ?? new Error('Player not found') };
  }

  const { data: record, error: recordError } = await supabase
    .from('records_bandon')
    .select('wins, losses, ties')
    .eq('playerId', player.id)
    .single();

  if (recordError || !record) {
    return { data: null, error: recordError ?? new Error('Record not found') };
  }

  return {
    data: {
      wins: record.wins ?? 0,
      losses: record.losses ?? 0,
      ties: record.ties ?? 0,
    },
    error: null,
  };
}
