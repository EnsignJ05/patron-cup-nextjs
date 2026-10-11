import { computeMatchPlayState, type MatchPlayStateWithAllocation } from './matchPlay';
import { getScoringFormatByKey } from './formats';
import type { MatchSide, PlayerHoleEntry, ScoringHole } from './types';

export type LiveMatchScorecardRow = {
  match_id: string;
  course_id: string | null;
  holes_count: number;
  format_key: string;
};

export type LiveMatchHoleScoreRow = {
  match_id: string;
  hole_number: number;
  player_id: string;
  gross_strokes: number | null;
  is_conceded: boolean;
};

export type LiveMatchPlayerRow = {
  match_id: string;
  player_id: string;
  team_id: string;
  strokes_received: number | null;
};

export type BuildLiveMatchStatesInput = {
  scorecards: LiveMatchScorecardRow[];
  holeScores: LiveMatchHoleScoreRow[];
  matchPlayers: LiveMatchPlayerRow[];
  /** Course holes, pre-fetched by the caller (Task P5.1's hook owns the Supabase
   * round trips; this function stays pure and synchronous). */
  holesByCourseId: Map<string, ScoringHole[]>;
};

/**
 * Pure transform behind useLiveMatchScores (Task P5.1): already-fetched scorecards +
 * hole scores + match players -> one MatchPlayState per match with a started
 * scorecard. A match with no scorecard row is simply absent from the result, which
 * the caller renders as today's upcoming/final chip (section on Task P5.2).
 */
export function buildLiveMatchStates(input: BuildLiveMatchStatesInput): Map<string, MatchPlayStateWithAllocation> {
  const { scorecards, holeScores, matchPlayers, holesByCourseId } = input;

  const holeScoresByMatch = new Map<string, LiveMatchHoleScoreRow[]>();
  holeScores.forEach((row) => {
    const list = holeScoresByMatch.get(row.match_id) ?? [];
    list.push(row);
    holeScoresByMatch.set(row.match_id, list);
  });

  const result = new Map<string, MatchPlayStateWithAllocation>();

  scorecards.forEach((scorecard) => {
    const playersForMatch = matchPlayers.filter((mp) => mp.match_id === scorecard.match_id);
    const teamIds = Array.from(new Set(playersForMatch.map((mp) => mp.team_id)));
    if (teamIds.length !== 2) return;

    const sides = teamIds.map((teamId) => ({
      teamId,
      players: playersForMatch
        .filter((mp) => mp.team_id === teamId)
        .map((mp) => ({ playerId: mp.player_id, strokesReceived: mp.strokes_received ?? 0 })),
    })) as [MatchSide, MatchSide];

    const holes: ScoringHole[] = scorecard.course_id ? holesByCourseId.get(scorecard.course_id) ?? [] : [];

    const entries: PlayerHoleEntry[] = (holeScoresByMatch.get(scorecard.match_id) ?? []).map((s) => ({
      holeNumber: s.hole_number,
      playerId: s.player_id,
      grossStrokes: s.gross_strokes,
      isConceded: s.is_conceded,
    }));

    const format = getScoringFormatByKey(scorecard.format_key);
    const state = computeMatchPlayState({
      format,
      holes,
      holesCount: scorecard.holes_count,
      sides,
      entries,
    });

    result.set(scorecard.match_id, state);
  });

  return result;
}
