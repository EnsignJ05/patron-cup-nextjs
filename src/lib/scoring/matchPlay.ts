import { allocateStrokes } from './strokeAllocation';
import type {
  DerivedResult,
  HoleResult,
  MatchPlayState,
  MatchPlayStatus,
  MatchSide,
  PlayerHoleEntry,
  PlayerNetHoleScore,
  ScoringFormat,
  ScoringHole,
} from './types';

export type ComputeMatchPlayStateInput = {
  format: ScoringFormat;
  holes: ScoringHole[];
  holesCount: number;
  sides: [MatchSide, MatchSide];
  entries: PlayerHoleEntry[];
};

/** Extra signal beyond the plan's documented MatchPlayState shape, for Task P4.2's
 * "missing stroke data" banner: players whose strokes couldn't be allocated (section
 * 8.2) score at gross for every hole instead of silently guessing a net. */
export type MatchPlayStateWithAllocation = MatchPlayState & { unallocatedPlayerIds: string[] };

export function computeMatchPlayState(input: ComputeMatchPlayStateInput): MatchPlayStateWithAllocation {
  const { format, holes, holesCount, sides, entries } = input;
  const [sideA, sideB] = sides;

  const allocationByPlayer = new Map<string, Map<number, number> | null>();
  const unallocatedPlayerIds: string[] = [];
  [...sideA.players, ...sideB.players].forEach((p) => {
    const result = allocateStrokes(p.strokesReceived, holes);
    if (result.ok) {
      allocationByPlayer.set(p.playerId, result.strokesByHole);
    } else {
      allocationByPlayer.set(p.playerId, null);
      unallocatedPlayerIds.push(p.playerId);
    }
  });

  const entryIndex = new Map<string, PlayerHoleEntry>();
  entries.forEach((e) => entryIndex.set(`${e.holeNumber}:${e.playerId}`, e));

  const netFor = (hole: number, playerId: string): PlayerNetHoleScore => {
    const entry = entryIndex.get(`${hole}:${playerId}`);
    if (!entry) return { playerId, net: null, isConceded: false };
    if (entry.isConceded) return { playerId, net: null, isConceded: true };
    if (entry.grossStrokes == null) return { playerId, net: null, isConceded: false };

    const allocation = allocationByPlayer.get(playerId);
    const strokes = allocation ? allocation.get(hole) ?? 0 : 0;
    return { playerId, net: entry.grossStrokes - strokes, isConceded: false };
  };

  const holeResults: HoleResult[] = [];
  const incompleteHoles: number[] = [];

  for (let hole = 1; hole <= holesCount; hole++) {
    const aNets = sideA.players.map((p) => netFor(hole, p.playerId));
    const bNets = sideB.players.map((p) => netFor(hole, p.playerId));
    const sideAScore = format.scoreSideHole(aNets);
    const sideBScore = format.scoreSideHole(bNets);

    let wonBy: HoleResult['wonBy'] = null;
    if (sideAScore != null && sideBScore != null) {
      if (sideAScore === sideBScore) wonBy = 'halved';
      else if (format.compare === 'lower-is-better') wonBy = sideAScore < sideBScore ? 'A' : 'B';
      else wonBy = sideAScore > sideBScore ? 'A' : 'B';
    }

    holeResults.push({ hole, sideAScore, sideBScore, wonBy });

    const hasAnyEntry = [...aNets, ...bNets].some((n) => n.net != null || n.isConceded);
    if (wonBy == null && hasAnyEntry) incompleteHoles.push(hole);
  }

  // thru = contiguous resolved holes from hole 1. Match play is sequential; a hole
  // entered out of order (via the jump-to-hole sheet) doesn't count toward thru until
  // every hole before it is also resolved.
  let thru = 0;
  while (thru < holesCount && holeResults[thru].wonBy != null) thru++;

  // Running tally, stopping the moment the lead is mathematically unbeatable -- once
  // closed out, holes played afterward (if any) don't change the recorded margin.
  let margin = 0; // positive = side A up
  let closedOutAtHole: number | null = null;
  let decidedAtHole = 0;
  for (let hole = 1; hole <= thru; hole++) {
    const result = holeResults[hole - 1];
    if (result.wonBy === 'A') margin += 1;
    else if (result.wonBy === 'B') margin -= 1;
    decidedAtHole = hole;

    const holesRemaining = holesCount - hole;
    if (Math.abs(margin) > holesRemaining) {
      closedOutAtHole = hole;
      break;
    }
  }

  const status: MatchPlayStatus =
    entries.length === 0
      ? 'not_started'
      : closedOutAtHole != null
        ? 'closed_out'
        : thru === holesCount
          ? 'complete'
          : 'in_progress';

  const holesUp = Math.abs(margin);
  const leaderTeamId = margin === 0 ? null : margin > 0 ? sideA.teamId : sideB.teamId;
  const holesRemainingAtDecision = holesCount - decidedAtHole;
  const isDormie = status === 'in_progress' && holesUp > 0 && holesUp === holesRemainingAtDecision;

  let resultLabel = '';
  if (status === 'closed_out') {
    resultLabel = `${holesUp}&${holesRemainingAtDecision}`;
  } else if (status === 'complete' || status === 'in_progress') {
    resultLabel = margin === 0 ? 'A/S' : `${holesUp} UP`;
  }

  const derivedResult: DerivedResult | null =
    status === 'closed_out' || status === 'complete'
      ? { winnerTeamId: margin === 0 ? null : leaderTeamId, isHalved: margin === 0 }
      : null;

  return {
    holeResults,
    thru,
    leaderTeamId,
    holesUp,
    status,
    isDormie,
    closedOutAtHole,
    resultLabel,
    derivedResult,
    incompleteHoles,
    unallocatedPlayerIds,
  };
}
