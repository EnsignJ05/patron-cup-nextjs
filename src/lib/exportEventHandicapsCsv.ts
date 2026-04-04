import { escapeCsvCell } from '@/lib/exportEventMatchesCsv';

export type HandicapCsvRow = {
  playerName: string;
  teamName: string;
  officialHandicap: number | null;
  ghinNumber: string | null;
  ghinClub: string | null;
};

/**
 * CSV export for event roster handicaps (team_rosters + player GHIN fields).
 */
export function buildEventHandicapsCsv(
  event: { name: string; year: number } | null,
  rows: HandicapCsvRow[],
): string {
  const headers = [
    'event_name',
    'event_year',
    'Player',
    'Team',
    'Official Event Handicap',
    'GHIN Number',
    'GHIN Club',
  ];
  const lines = [headers.map(escapeCsvCell).join(',')];

  const eventName = event?.name ?? '';
  const eventYear = event?.year ?? '';

  const sorted = [...rows].sort((a, b) => {
    const t = a.teamName.localeCompare(b.teamName);
    if (t !== 0) return t;
    return a.playerName.localeCompare(b.playerName);
  });

  for (const row of sorted) {
    lines.push(
      [
        eventName,
        eventYear,
        row.playerName,
        row.teamName,
        row.officialHandicap,
        row.ghinNumber,
        row.ghinClub,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }

  return lines.join('\r\n');
}
