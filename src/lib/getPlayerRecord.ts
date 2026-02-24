import { supabase } from '@/lib/supabaseClient';
import { fetchBandonPlayerRecordByName } from '@/lib/repositories/bandon';

export interface PlayerRecord {
  wins: number;
  losses: number;
  ties: number;
}

/**
 * Fetches the record (wins, losses, ties) for a player by first and last name.
 * @param firstName Player's first name
 * @param lastName Player's last name
 * @returns PlayerRecord or null if not found
 */
export async function getPlayerRecord(firstName: string, lastName: string): Promise<PlayerRecord | null> {
  const { data, error } = await fetchBandonPlayerRecordByName(supabase, firstName, lastName);

  if (error || !data) {
    console.error('Record not found:', error);
    return null;
  }

  return data;
}