import { supabase } from './supabaseClient';
import { fetchBandonMatchesWithPlayers } from '@/lib/repositories/bandon';

export async function getMatchesWithPlayers() {
  return fetchBandonMatchesWithPlayers(supabase);
}