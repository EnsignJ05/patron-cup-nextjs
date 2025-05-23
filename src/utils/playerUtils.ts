import matchesData from '@/data/matches.json';
import reroundsData from '@/data/rerounds.json';

export interface Player {
  name: string;
  handicap: number | string;
}

export interface Match {
  match: number;
  group: number;
  course: string;
  date: string;
  time: string;
  matchType: string;
  team_thompson: Player[];
  team_burgess: Player[];
  winner: string | null;
}

export interface Reround {
  course: string;
  date: string;
  time: string;
  group?: number;
  players: string[];
}

export interface PlayerRecord {
  wins: number;
  losses: number;
  ties: number;
}

export function getPlayerMatches(playerName: string): Match[] {
  return matchesData.matches.filter(match => {
    const allPlayers = [...match.team_thompson, ...match.team_burgess];
    return allPlayers.some(player => player.name === playerName);
  });
}

export function getPlayerRerounds(playerName: string): Reround[] {
  return reroundsData.rerounds.filter((reround: Reround) => 
    reround.players.includes(playerName)
  );
}

export function getPlayerTeam(playerName: string, match: Match): 'Thompson' | 'Burgess' {
  if (match.team_thompson.some(player => player.name === playerName)) {
    return 'Thompson';
  }
  return 'Burgess';
}

export function getPlayerHandicap(playerName: string): number | string {
  // Find the player's handicap from any match they're in
  for (const match of matchesData.matches) {
    const allPlayers = [...match.team_thompson, ...match.team_burgess];
    const player = allPlayers.find(p => p.name === playerName);
    if (player) {
      return player.handicap;
    }
  }
  return 'N/A';
}

export function getPlayerRecord(playerName: string): PlayerRecord {
  const record: PlayerRecord = { wins: 0, losses: 0, ties: 0 };
  
  matchesData.matches.forEach(match => {
    const playerTeam = getPlayerTeam(playerName, match);
    if (match.winner === 'tie') {
      record.ties++;
    } else if (match.winner === `team_${playerTeam.toLowerCase()}`) {
      record.wins++;
    } else if (match.winner) {
      record.losses++;
    }
  });
  
  return record;
}

export function formatPlayerSlug(playerName: string): string {
  return playerName.toLowerCase().replace(/\s+/g, '-');
}

export function unformatPlayerSlug(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getAllPlayers(): string[] {
  const playerSet = new Set<string>();
  
  matchesData.matches.forEach(match => {
    match.team_thompson.forEach(player => playerSet.add(player.name));
    match.team_burgess.forEach(player => playerSet.add(player.name));
  });
  
  return Array.from(playerSet).sort();
} 