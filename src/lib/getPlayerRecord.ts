import { supabase } from '@/lib/supabaseClient';

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
  // Query the player table for the id
  const { data: player, error: playerError } = await supabase
    .from('player')
    .select('id')
    .eq('f_name', firstName)
    .eq('l_name', lastName)
    .single();

  if (playerError || !player) {
    console.error('Player not found:', playerError);
    return null;
  }

  // Query the records_bandon table for the record
  const { data: record, error: recordError } = await supabase
    .from('records_bandon')
    .select('wins, losses, ties')
    .eq('playerId', player.id)
    .single();

  if (recordError || !record) {
    console.error('Record not found:', recordError);
    return null;
  }

  return {
    wins: record.wins ?? 0,
    losses: record.losses ?? 0,
    ties: record.ties ?? 0,
  };
} 