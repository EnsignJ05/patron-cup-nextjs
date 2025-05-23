import { getPlayerMatches, getPlayerRerounds, getPlayerHandicap, getPlayerRecord, unformatPlayerSlug } from './playerUtils';
import type { Match, Reround, PlayerRecord } from './playerUtils';

export interface PlayerData {
  name: string;
  handicap: number;
  record: PlayerRecord;
  matches: Match[];
  rerounds: Reround[];
}

export function getPlayerData(playerSlug: string): PlayerData | null {
  const playerName = unformatPlayerSlug(playerSlug);
  if (!playerName) return null;

  const handicap = getPlayerHandicap(playerName);
  if (typeof handicap !== 'number') return null;

  return {
    name: playerName,
    handicap,
    record: getPlayerRecord(playerName),
    matches: getPlayerMatches(playerName),
    rerounds: getPlayerRerounds(playerName),
  };
} 