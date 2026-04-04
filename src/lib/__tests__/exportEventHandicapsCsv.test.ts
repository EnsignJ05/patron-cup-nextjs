import { buildEventHandicapsCsv } from '../exportEventHandicapsCsv';
import { escapeCsvCell } from '../exportEventMatchesCsv';

describe('exportEventHandicapsCsv', () => {
  it('includes headers and event columns with sorted rows', () => {
    const event = { name: 'Patron Cup', year: 2026 };
    const csv = buildEventHandicapsCsv(event, [
      {
        playerName: 'Zed Last',
        teamName: 'Team B',
        officialHandicap: 12.4,
        ghinNumber: '12345',
        ghinClub: 'Oak, Country Club',
      },
      {
        playerName: 'Ann First',
        teamName: 'Team A',
        officialHandicap: null,
        ghinNumber: null,
        ghinClub: null,
      },
      {
        playerName: 'Bob Second',
        teamName: 'Team A',
        officialHandicap: 8,
        ghinNumber: '99',
        ghinClub: 'Pine',
      },
    ]);
    const lines = csv.split(/\r\n/);
    expect(lines[0]).toBe(
      [
        'event_name',
        'event_year',
        'Player',
        'Team',
        'Official Event Handicap',
        'GHIN Number',
        'GHIN Club',
      ].map(escapeCsvCell).join(','),
    );
    expect(lines[1]).toContain('Patron Cup');
    expect(lines[1]).toContain('2026');
    expect(lines[1]).toContain('Ann First');
    expect(lines[1]).toContain('Team A');
    expect(lines[2]).toContain('Bob Second');
    expect(lines[2]).toContain('Team A');
    expect(lines[3]).toContain('Zed Last');
    expect(lines[3]).toContain('Team B');
    expect(lines[3]).toContain('"Oak, Country Club"');
  });

  it('handles null event', () => {
    const csv = buildEventHandicapsCsv(null, [
      {
        playerName: 'Only One',
        teamName: 'Solo',
        officialHandicap: 5,
        ghinNumber: 'x',
        ghinClub: 'y',
      },
    ]);
    const lines = csv.split(/\r\n/);
    expect(lines[1]).toMatch(/^,,Only One,Solo,5,x,y$/);
  });
});
