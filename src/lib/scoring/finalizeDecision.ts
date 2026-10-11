import { computeMatchPlayState } from './matchPlay';
import { getScoringFormatByKey } from './formats';
import type { MatchSide, PlayerHoleEntry, ScoringHole } from './types';

export type FinalizeScorecardInput = {
  callerPlayerId: string;
  callerRole: string;
  resultSetByOfficial: boolean;
  currentResult: { winnerTeamId: string | null; isHalved: boolean };
  scorecard: { status: 'in_progress' | 'final' | 'abandoned'; holes_count: number; format_key: string } | null;
  matchPlayers: { player_id: string; team_id: string; strokes_received: number | null }[];
  holeScores: { hole_number: number; player_id: string; gross_strokes: number | null; is_conceded: boolean }[];
  courseHoles: { hole_number: number; par: number; handicap_index: number | null }[];
};

export type FinalizeScorecardDecision =
  | { kind: 'forbidden'; message: string }
  | { kind: 'locked'; message: string }
  | { kind: 'no_scorecard'; message: string }
  | { kind: 'incomplete'; incompleteHoles: number[] }
  | { kind: 'already_final'; winnerTeamId: string | null; isHalved: boolean; resultLabel: string }
  | { kind: 'finalize'; winnerTeamId: string | null; isHalved: boolean; resultLabel: string };

/**
 * Pure decision logic behind POST /api/matches/[matchId]/finalize (Task P3.5). The
 * client's claimed result is never read -- this recomputes from the same rows the
 * engine already trusts, which is what makes decision 2.5's auto-finalize safe.
 */
export function decideFinalizeMatchScorecard(input: FinalizeScorecardInput): FinalizeScorecardDecision {
  const isParticipant = input.matchPlayers.some((mp) => mp.player_id === input.callerPlayerId);
  const isCommittee = input.callerRole === 'committee' || input.callerRole === 'admin';
  if (!isParticipant && !isCommittee) {
    return { kind: 'forbidden', message: 'Not a participant in this match' };
  }

  if (input.resultSetByOfficial) {
    return { kind: 'locked', message: 'Result was set by committee; scoring disabled' };
  }

  if (!input.scorecard) {
    return { kind: 'no_scorecard', message: 'Scorecard has not been started for this match' };
  }

  const teamIds = Array.from(new Set(input.matchPlayers.map((mp) => mp.team_id)));
  if (teamIds.length !== 2) {
    return { kind: 'no_scorecard', message: 'Match does not have exactly two teams' };
  }

  const sides = teamIds.map((teamId) => ({
    teamId,
    players: input.matchPlayers
      .filter((mp) => mp.team_id === teamId)
      .map((mp) => ({ playerId: mp.player_id, strokesReceived: mp.strokes_received ?? 0 })),
  })) as [MatchSide, MatchSide];

  const holes: ScoringHole[] = input.courseHoles.map((h) => ({
    holeNumber: h.hole_number,
    par: h.par,
    handicapIndex: h.handicap_index,
  }));

  const entries: PlayerHoleEntry[] = input.holeScores.map((s) => ({
    holeNumber: s.hole_number,
    playerId: s.player_id,
    grossStrokes: s.gross_strokes,
    isConceded: s.is_conceded,
  }));

  const format = getScoringFormatByKey(input.scorecard.format_key);
  const state = computeMatchPlayState({
    format,
    holes,
    holesCount: input.scorecard.holes_count,
    sides,
    entries,
  });

  if (input.scorecard.status === 'final') {
    return {
      kind: 'already_final',
      winnerTeamId: input.currentResult.winnerTeamId,
      isHalved: input.currentResult.isHalved,
      resultLabel: state.resultLabel,
    };
  }

  if (state.status !== 'closed_out' && state.status !== 'complete') {
    return { kind: 'incomplete', incompleteHoles: state.incompleteHoles };
  }

  return {
    kind: 'finalize',
    winnerTeamId: state.derivedResult!.winnerTeamId,
    isHalved: state.derivedResult!.isHalved,
    resultLabel: state.resultLabel,
  };
}
