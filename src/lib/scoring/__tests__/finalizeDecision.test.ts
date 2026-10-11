import { decideFinalizeMatchScorecard, type FinalizeScorecardInput } from '@/lib/scoring/finalizeDecision';

const holes18 = Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, par: 4, handicap_index: i + 1 }));

const baseInput: FinalizeScorecardInput = {
  callerPlayerId: 'a1',
  callerRole: 'player',
  resultSetByOfficial: false,
  currentResult: { winnerTeamId: null, isHalved: false },
  scorecard: { status: 'in_progress', holes_count: 18, format_key: 'singles_match_play' },
  matchPlayers: [
    { player_id: 'a1', team_id: 'teamA', strokes_received: 0 },
    { player_id: 'b1', team_id: 'teamB', strokes_received: 0 },
  ],
  holeScores: [],
  courseHoles: holes18,
};

function holeScoresFor(n: number, aScore: number, bScore: number) {
  const out: FinalizeScorecardInput['holeScores'] = [];
  for (let h = 1; h <= n; h++) {
    out.push({ hole_number: h, player_id: 'a1', gross_strokes: aScore, is_conceded: false });
    out.push({ hole_number: h, player_id: 'b1', gross_strokes: bScore, is_conceded: false });
  }
  return out;
}

describe('decideFinalizeMatchScorecard', () => {
  it('forbids a caller who is neither a participant nor committee/admin', () => {
    const decision = decideFinalizeMatchScorecard({ ...baseInput, callerPlayerId: 'stranger' });
    expect(decision.kind).toBe('forbidden');
  });

  it('allows committee/admin even when not a participant', () => {
    const decision = decideFinalizeMatchScorecard({
      ...baseInput,
      callerPlayerId: 'stranger',
      callerRole: 'committee',
      holeScores: holeScoresFor(18, 4, 4),
    });
    expect(decision.kind).toBe('finalize');
  });

  it('refuses when the committee already set an official result', () => {
    const decision = decideFinalizeMatchScorecard({ ...baseInput, resultSetByOfficial: true });
    expect(decision).toEqual({ kind: 'locked', message: 'Result was set by committee; scoring disabled' });
  });

  it('refuses when no scorecard has been started', () => {
    const decision = decideFinalizeMatchScorecard({ ...baseInput, scorecard: null });
    expect(decision.kind).toBe('no_scorecard');
  });

  it('refuses to finalize an incomplete round and names the blank holes', () => {
    const decision = decideFinalizeMatchScorecard({
      ...baseInput,
      holeScores: [{ hole_number: 1, player_id: 'a1', gross_strokes: 4, is_conceded: false }],
      // b1's hole 1 is never entered.
    });
    expect(decision.kind).toBe('incomplete');
    if (decision.kind === 'incomplete') expect(decision.incompleteHoles).toEqual([1]);
  });

  it('finalizes a halved 18-hole round with no winner', () => {
    const decision = decideFinalizeMatchScorecard({ ...baseInput, holeScores: holeScoresFor(18, 4, 4) });
    expect(decision).toEqual({ kind: 'finalize', winnerTeamId: null, isHalved: true, resultLabel: 'A/S' });
  });

  it('finalizes a closed-out round with the winning team and a real margin label', () => {
    const holeScores = holeScoresFor(10, 3, 5); // A wins every hole; closes out well before 18
    const decision = decideFinalizeMatchScorecard({ ...baseInput, holeScores });
    expect(decision.kind).toBe('finalize');
    if (decision.kind === 'finalize') {
      expect(decision.winnerTeamId).toBe('teamA');
      expect(decision.isHalved).toBe(false);
      expect(decision.resultLabel).toMatch(/&/);
    }
  });

  it('does not re-finalize an already-final scorecard, and reports the stored result', () => {
    const decision = decideFinalizeMatchScorecard({
      ...baseInput,
      scorecard: { status: 'final', holes_count: 18, format_key: 'singles_match_play' },
      currentResult: { winnerTeamId: 'teamA', isHalved: false },
      holeScores: holeScoresFor(18, 4, 4), // a fabricated body shouldn't matter -- ignored for already-final
    });
    expect(decision.kind).toBe('already_final');
    if (decision.kind === 'already_final') {
      expect(decision.winnerTeamId).toBe('teamA');
      expect(decision.isHalved).toBe(false);
    }
  });

  it('refuses when the match does not have exactly two teams', () => {
    const decision = decideFinalizeMatchScorecard({
      ...baseInput,
      matchPlayers: [{ player_id: 'a1', team_id: 'teamA', strokes_received: 0 }],
    });
    expect(decision.kind).toBe('no_scorecard');
  });
});
