import { supabase } from './supabaseClient';

export async function getAllPlayersAndMatches() {
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