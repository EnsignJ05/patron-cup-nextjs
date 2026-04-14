import { buildEventMatchHandicapStrokesCsv } from '../exportEventMatchHandicapStrokesCsv';
import { escapeCsvCell } from '../exportEventMatchesCsv';

describe('exportEventMatchHandicapStrokesCsv', () => {
  it('includes all match rows with event metadata and escaping', () => {
    const csv = buildEventMatchHandicapStrokesCsv(
      { name: 'Patron Cup', year: 2026 },
      [
        {
          courseName: 'Bandon Dunes',
          matchDate: '2026-04-10',
          matchTime: '08:30',
          groupNumber: 1,
          matchNumber: 2,
          matchType: 'Singles',
          teamName: 'Team A',
          playerName: 'Ann "Ace" Archer',
          officialEventHandicap: 8.4,
          courseHandicap: 10,
          strokesGiven: 1,
        },
        {
          courseName: 'Pacific Dunes',
          matchDate: '2026-04-11',
          matchTime: null,
          groupNumber: null,
          matchNumber: 4,
          matchType: 'Better Ball',
          teamName: 'Team B',
          playerName: 'Bob Baker',
          officialEventHandicap: null,
          courseHandicap: null,
          strokesGiven: null,
        },
      ],
    );

    const lines = csv.split(/\r\n/);
    expect(lines[0]).toBe(
      [
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
      ]
        .map(escapeCsvCell)
        .join(','),
    );
    expect(lines[1]).toContain('Patron Cup');
    expect(lines[1]).toContain('2026');
    expect(lines[1]).toContain('"Ann ""Ace"" Archer"');
    expect(lines[1]).toMatch(/,8\.4,10,1$/);
    expect(lines[2]).toContain('Pacific Dunes');
    expect(lines[2]).toMatch(/,Bob Baker,,,$/);
  });

  it('handles null event', () => {
    const csv = buildEventMatchHandicapStrokesCsv(null, [
      {
        courseName: 'Old Macdonald',
        matchDate: '2026-04-12',
        matchTime: '09:10',
        groupNumber: 2,
        matchNumber: 1,
        matchType: 'Singles',
        teamName: 'Team C',
        playerName: 'Carl Chipper',
        officialEventHandicap: 9,
        courseHandicap: 11,
        strokesGiven: 0,
      },
    ]);
    const lines = csv.split(/\r\n/);
    expect(lines[1]).toMatch(/^,,Old Macdonald,2026-04-12,09:10,2,1,Singles,Team C,Carl Chipper,9,11,0$/);
  });
});
