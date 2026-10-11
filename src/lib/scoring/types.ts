/** Shared shapes for the live-scoring engine (src/lib/scoring/**). Pure data -- no
 * Supabase types, no React -- so this module has zero infrastructure dependencies. */

export type ScoringHole = {
  holeNumber: number;
  par: number;
  handicapIndex: number | null;
};

export type AllocateStrokesResult =
  | { ok: true; strokesByHole: Map<number, number> }
  | { ok: false; reason: 'missing_handicap_index'; missingHoleNumbers: number[] };

/** One player's gross entry for one hole. `grossStrokes` is null until entered. */
export type PlayerHoleEntry = {
  holeNumber: number;
  playerId: string;
  grossStrokes: number | null;
  isConceded: boolean;
};

/** A player's net score on one hole, already stroke-adjusted. `net` is null if the
 * hole hasn't been entered and the player didn't pick up. */
export type PlayerNetHoleScore = {
  playerId: string;
  net: number | null;
  isConceded: boolean;
};

export type ScoringFormat = {
  key: string;
  label: string;
  playersPerTeam: number;
  /** Decision 2.1: per-format default handicap allowance, seeded at 1.0 so initial
   * behavior matches calculateMatchHandicapMetrics exactly. */
  defaultAllowance: number;
  /** Reduce one side's per-player net entries to that side's score for the hole. */
  scoreSideHole(entries: PlayerNetHoleScore[]): number | null;
  compare: 'lower-is-better' | 'higher-is-better';
};

export type MatchSidePlayer = {
  playerId: string;
  /** Match strokes received after allowance (decision 2.1/2.2), pre-allocation. */
  strokesReceived: number;
};

export type MatchSide = {
  teamId: string;
  players: MatchSidePlayer[];
};

export type HoleResult = {
  hole: number;
  sideAScore: number | null;
  sideBScore: number | null;
  wonBy: 'A' | 'B' | 'halved' | null;
};

export type MatchPlayStatus = 'not_started' | 'in_progress' | 'closed_out' | 'complete';

export type DerivedResult = { winnerTeamId: string | null; isHalved: boolean };

export type MatchPlayState = {
  holeResults: HoleResult[];
  thru: number;
  leaderTeamId: string | null;
  holesUp: number;
  status: MatchPlayStatus;
  isDormie: boolean;
  closedOutAtHole: number | null;
  resultLabel: string;
  derivedResult: DerivedResult | null;
  incompleteHoles: number[];
};
