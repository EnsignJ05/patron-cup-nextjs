import { escapeCsvCell } from '@/lib/exportEventMatchesCsv';

export type EventMatchHandicapStrokesCsvRow = {
  courseName: string;
  matchDate: string;
  matchTime: string | null;
  groupNumber: number | null;
  matchNumber: number;
  matchType: string;
  teamName: string;
  playerName: string;
  officialEventHandicap: number | null;
  courseHandicap: number | null;
  strokesGiven: number | null;
};

export function buildEventMatchHandicapStrokesCsv(
  event: { name: string; year: number } | null,
  rows: EventMatchHandicapStrokesCsvRow[],
): string {
  const headers = [
    'event_name',
    'event_year',
    'course_name',
    'match_date',
    'match_time',
    'group_number',
    'match_number',
    'match_type',
    'team_name',
    'player_name',
    'official_event_handicap',
    'course_handicap',
    'strokes_given',
  ];
  const lines = [headers.map(escapeCsvCell).join(',')];

  const eventName = event?.name ?? '';
  const eventYear = event?.year ?? '';

  for (const row of rows) {
    lines.push(
      [
        eventName,
        eventYear,
        row.courseName,
        row.matchDate,
        row.matchTime,
        row.groupNumber,
        row.matchNumber,
        row.matchType,
        row.teamName,
        row.playerName,
        row.officialEventHandicap,
        row.courseHandicap,
        row.strokesGiven,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }

  return lines.join('\r\n');
}
