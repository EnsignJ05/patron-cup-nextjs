import {
  buildEventMatchesCsv,
  escapeCsvCell,
  sanitizeFilenameSegment,
} from '../exportEventMatchesCsv';

describe('exportEventMatchesCsv', () => {
  describe('escapeCsvCell', () => {
    it('returns empty string for nullish', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });

    it('wraps and doubles quotes when field contains comma or quote or newline', () => {
      expect(escapeCsvCell('a,b')).toBe('"a,b"');
      expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
      expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
    });

    it('passes through simple values', () => {
      expect(escapeCsvCell('plain')).toBe('plain');
      expect(escapeCsvCell(42)).toBe('42');
      expect(escapeCsvCell(true)).toBe('true');
    });
  });

  describe('buildEventMatchesCsv', () => {
    it('builds header and rows with team player lists', () => {
      const event = { name: 'Cup 2026', year: 2026 };
      const teams = [
        { id: 't1', name: 'Alpha', event_id: 'e1', color: null, logo_url: null, created_at: '', updated_at: '' },
        { id: 't2', name: 'Beta', event_id: 'e1', color: null, logo_url: null, created_at: '', updated_at: '' },
      ];
      const matches = [
        {
          id: 'm1',
          event_id: 'e1',
          match_number: 1,
          group_number: 2,
          course_id: 'c1',
          match_date: '2026-03-01',
          match_time: '09:00:00',
          match_type: 'Singles',
          winner_team_id: 't1',
          is_halved: false,
          notes: null,
          created_at: '',
          updated_at: '',
          course: { id: 'c1', name: 'Ocean', event_id: 'e1', resort_name: null, par: 72, rating: null, slope: null, yardage: null, description: null, image_url: null, created_at: '', updated_at: '' },
          winner_team: { id: 't1', name: 'Alpha', event_id: 'e1', color: null, logo_url: null, created_at: '', updated_at: '' },
        },
      ];
      const map = new Map<string, { team_id: string; player?: { first_name: string; last_name: string } }[]>();
      map.set('m1', [
        { team_id: 't1', player: { first_name: 'Ann', last_name: 'A' } },
        { team_id: 't2', player: { first_name: 'Bob', last_name: 'B' } },
      ]);

      const csv = buildEventMatchesCsv(event, matches, teams, map);
      const lines = csv.split(/\r\n/);
      expect(lines[0]).toContain('event_name');
      expect(lines[0]).toContain('team_1_players');
      expect(lines[1]).toContain('Cup 2026');
      expect(lines[1]).toContain('Ann A');
      expect(lines[1]).toContain('Bob B');
      expect(lines[1]).toContain('Ocean');
      expect(lines[1]).toContain('Alpha');
    });
  });

  describe('sanitizeFilenameSegment', () => {
    it('replaces unsafe characters', () => {
      expect(sanitizeFilenameSegment('Hello / World!')).toBe('Hello-World');
    });
  });
});
