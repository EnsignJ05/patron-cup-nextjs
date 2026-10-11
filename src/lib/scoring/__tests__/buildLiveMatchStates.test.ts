import { buildLiveMatchStates } from '@/lib/scoring/buildLiveMatchStates';
import type { ScoringHole } from '@/lib/scoring/types';

const holes18: ScoringHole[] = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  handicapIndex: i + 1,
}));

describe('buildLiveMatchStates', () => {
  it('computes a state for each scorecard with its own match players and hole scores', () => {
    const result = buildLiveMatchStates({
      scorecards: [
        { match_id: 'm1', course_id: 'c1', holes_count: 18, format_key: 'singles_match_play' },
        { match_id: 'm2', course_id: 'c1', holes_count: 18, format_key: 'singles_match_play' },
      ],
      matchPlayers: [
        { match_id: 'm1', player_id: 'a1', team_id: 'teamA', strokes_received: 0 },
        { match_id: 'm1', player_id: 'b1', team_id: 'teamB', strokes_received: 0 },
        { match_id: 'm2', player_id: 'a2', team_id: 'teamA', strokes_received: 0 },
        { match_id: 'm2', player_id: 'b2', team_id: 'teamB', strokes_received: 0 },
      ],
      holeScores: [
        { match_id: 'm1', hole_number: 1, player_id: 'a1', gross_strokes: 3, is_conceded: false },
        { match_id: 'm1', hole_number: 1, player_id: 'b1', gross_strokes: 4, is_conceded: false },
      ],
      holesByCourseId: new Map([['c1', holes18]]),
    });

    expect(result.size).toBe(2);
    expect(result.get('m1')!.thru).toBe(1);
    expect(result.get('m1')!.leaderTeamId).toBe('teamA');
    expect(result.get('m2')!.thru).toBe(0);
    expect(result.get('m2')!.status).toBe('not_started');
  });

  it('skips a scorecard whose match does not have exactly two teams', () => {
    const result = buildLiveMatchStates({
      scorecards: [{ match_id: 'm1', course_id: 'c1', holes_count: 18, format_key: 'singles_match_play' }],
      matchPlayers: [{ match_id: 'm1', player_id: 'a1', team_id: 'teamA', strokes_received: 0 }],
      holeScores: [],
      holesByCourseId: new Map([['c1', holes18]]),
    });

    expect(result.size).toBe(0);
  });

  it('treats a course with no fetched holes as an empty hole list rather than throwing', () => {
    const result = buildLiveMatchStates({
      scorecards: [{ match_id: 'm1', course_id: 'c-missing', holes_count: 18, format_key: 'singles_match_play' }],
      matchPlayers: [
        { match_id: 'm1', player_id: 'a1', team_id: 'teamA', strokes_received: 0 },
        { match_id: 'm1', player_id: 'b1', team_id: 'teamB', strokes_received: 0 },
      ],
      holeScores: [],
      holesByCourseId: new Map(),
    });

    expect(result.get('m1')!.status).toBe('not_started');
  });
});
