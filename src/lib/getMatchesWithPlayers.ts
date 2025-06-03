import { supabase } from './supabaseClient';

export async function getMatchesWithPlayers() {
  const [matchRes, playerRes] = await Promise.all([
    supabase.from('match_bandon').select('*'),
    supabase.from('player').select('id, f_name, l_name, handicap'),
  ]);

  if (matchRes.error) throw new Error(matchRes.error.message);
  if (playerRes.error) throw new Error(playerRes.error.message);

  const players = playerRes.data || [];
  const playerMap = new Map(players.map((p: any) => [p.id, p]));

  const matchesWithPlayers = (matchRes.data || []).map((m: any) => ({
    ...m,
    thompson_player1: playerMap.get(m.thompson_player1) || null,
    thompson_player2: playerMap.get(m.thompson_player2) || null,
    burgess_player1: playerMap.get(m.burgess_player1) || null,
    burgess_player2: playerMap.get(m.burgess_player2) || null,
  }));

  return matchesWithPlayers;
} 