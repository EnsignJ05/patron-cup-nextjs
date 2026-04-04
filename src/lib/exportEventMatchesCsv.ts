import type { Course, Match, Team } from '@/types/database';

export type MatchForCsvExport = Match & {
  course?: Course | null;
  winner_team?: Team | null;
};

export type MatchPlayerForCsvExport = {
  team_id: string;
  player?: { first_name: string; last_name: string } | null;
};

/** RFC-style CSV field escaping (commas, quotes, newlines). */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function playerNamesForTeam(
  matchId: string,
  teamId: string,
  matchPlayersByMatchId: Map<string, MatchPlayerForCsvExport[]>,
): string {
  const rows = matchPlayersByMatchId.get(matchId) || [];
  return rows
    .filter((mp) => mp.team_id === teamId)
    .map((mp) => `${mp.player?.first_name ?? ''} ${mp.player?.last_name ?? ''}`.trim())
    .filter(Boolean)
    .join('; ');
}

/**
 * Builds a CSV string for all matches in an event (same ordering as typical match queries).
 */
export function buildEventMatchesCsv(
  event: { name: string; year: number } | null,
  matches: MatchForCsvExport[],
  teams: Team[],
  matchPlayersByMatchId: Map<string, MatchPlayerForCsvExport[]>,
): string {
  const team1 = teams[0];
  const team2 = teams[1];

  const headers = [
    'event_name',
    'event_year',
    'match_date',
    'match_time',
    'course_name',
    'match_number',
    'group_number',
    'match_type',
    'winner_team_name',
    'is_halved',
    'notes',
    'team_1_name',
    'team_1_players',
    'team_2_name',
    'team_2_players',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];

  const eventName = event?.name ?? '';
  const eventYear = event?.year ?? '';

  for (const match of matches) {
    const winnerName = match.winner_team?.name ?? '';
    const courseName = match.course?.name ?? '';
    const t1Name = team1?.name ?? '';
    const t2Name = team2?.name ?? '';
    const t1Players = team1 ? playerNamesForTeam(match.id, team1.id, matchPlayersByMatchId) : '';
    const t2Players = team2 ? playerNamesForTeam(match.id, team2.id, matchPlayersByMatchId) : '';

    const row = [
      eventName,
      eventYear,
      match.match_date,
      match.match_time ?? '',
      courseName,
      match.match_number,
      match.group_number ?? '',
      match.match_type,
      winnerName,
      match.is_halved ? 'true' : 'false',
      match.notes ?? '',
      t1Name,
      t1Players,
      t2Name,
      t2Players,
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  }

  return lines.join('\r\n');
}

export function sanitizeFilenameSegment(name: string): string {
  return name
    .trim()
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'event';
}
