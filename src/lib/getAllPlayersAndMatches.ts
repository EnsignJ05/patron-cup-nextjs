import { supabase } from './supabaseClient';
import { fetchBandonMatchesAndPlayers } from '@/lib/repositories/bandon';

export async function getAllPlayersAndMatches() {
  return fetchBandonMatchesAndPlayers(supabase);
}