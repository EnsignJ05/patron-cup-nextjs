import { computeMatchPlayState } from '@/lib/scoring/matchPlay';
import { fourBallNetBestBall, singlesMatchPlay } from '@/lib/scoring/formats';
import type { MatchSide, PlayerHoleEntry, ScoringHole } from '@/lib/scoring/types';

const holes18: ScoringHole[] = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  handicapIndex: i + 1,
}));

const sidesSingles: [MatchSide, MatchSide] = [
  { teamId: 'teamA', players: [{ playerId: 'a1', strokesReceived: 0 }] },
  { teamId: 'teamB', players: [{ playerId: 'b1', strokesReceived: 0 }] },
];

/** Builds entries for holes 1..n: side A shoots `aScore`, side B shoots `bScore`. */
function entriesFor(n: number, aScore: number, bScore: number): PlayerHoleEntry[] {
  const entries: PlayerHoleEntry[] = [];
  for (let h = 1; h <= n; h++) {
    entries.push({ holeNumber: h, playerId: 'a1', grossStrokes: aScore, isConceded: false });
    entries.push({ holeNumber: h, playerId: 'b1', grossStrokes: bScore, isConceded: false });
  }
  return entries;
}

describe('computeMatchPlayState', () => {
  it('reports all-square and complete when every hole is halved through 18', () => {
    const state = computeMatchPlayState({
      format: singlesMatchPlay,
      holes: holes18,
      holesCount: 18,
      sides: sidesSingles,
      entries: entriesFor(18, 4, 4),
    });

    expect(state.thru).toBe(18);
    expect(state.status).toBe('complete');
    expect(state.holesUp).toBe(0);
    expect(state.leaderTeamId).toBeNull();
    expect(state.resultLabel).toBe('A/S');
    expect(state.derivedResult).toEqual({ winnerTeamId: null, isHalved: true });
    expect(state.closedOutAtHole).toBeNull();
  });

  it('is equivalent to a halved match when every hole halves (explicit halved-match case)', () => {
    const state = computeMatchPlayState({
      format: singlesMatchPlay,
      holes: holes18,
      holesCount: 18,
      sides: sidesSingles,
      entries: entriesFor(18, 5, 5),
    });
    expect(state.derivedResult?.isHalved).toBe(true);
    expect(state.holeResults.every((r) => r.wonBy === 'halved')).toBe(true);
  });

  it('closes out a match 3&2 and stops the margin from moving on holes played afterward', () => {
    // Side A wins holes 1-16 (16 holes), decided well before 16; margin should lock at
    // the close-out point even though we also feed a (hypothetical) entry for hole 17.
    const entries = entriesFor(16, 3, 5); // A always shoots lower (wins every hole)
    entries.push({ holeNumber: 17, playerId: 'a1', grossStrokes: 4, isConceded: false });
    entries.push({ holeNumber: 17, playerId: 'b1', grossStrokes: 3, isConceded: false }); // B would win 17 if it counted

    const state = computeMatchPlayState({
      format: singlesMatchPlay,
      holes: holes18,
      holesCount: 18,
      sides: sidesSingles,
      entries,
    });

    // A wins every hole, so the margin outruns holes-remaining well before hole 16
    // (margin=10 > holesRemaining=8 at hole 10) -- it closes out long before 16&2.
    expect(state.status).toBe('closed_out');
    expect(state.closedOutAtHole).toBeLessThan(16);
    expect(state.leaderTeamId).toBe('teamA');
    // Confirm hole 17's (reversed) result did not change the leader/margin.
    expect(state.leaderTeamId).toBe('teamA');
  });

  it('produces a real 3&2 scoreline when the lead becomes unbeatable at hole 16', () => {
    // All square through 13, then A wins 14, 15, 16 -> 3 up with 2 to play.
    const entries: PlayerHoleEntry[] = [];
    for (let h = 1; h <= 13; h++) {
      entries.push({ holeNumber: h, playerId: 'a1', grossStrokes: 4, isConceded: false });
      entries.push({ holeNumber: h, playerId: 'b1', grossStrokes: 4, isConceded: false });
    }
    for (let h = 14; h <= 16; h++) {
      entries.push({ holeNumber: h, playerId: 'a1', grossStrokes: 3, isConceded: false });
      entries.push({ holeNumber: h, playerId: 'b1', grossStrokes: 5, isConceded: false });
    }

    const state = computeMatchPlayState({
      format: singlesMatchPlay,
      holes: holes18,
      holesCount: 18,
      sides: sidesSingles,
      entries,
    });

    expect(state.status).toBe('closed_out');
    expect(state.closedOutAtHole).toBe(16);
    expect(state.resultLabel).toBe('3&2');
    expect(state.derivedResult).toEqual({ winnerTeamId: 'teamA', isHalved: false });
  });

  it('reports dormie when the lead exactly equals holes remaining', () => {
    // All square through 12, then A wins 13, 14, 15 -> 3 up with 3 to play (dormie).
    const entries: PlayerHoleEntry[] = [];
    for (let h = 1; h <= 12; h++) {
      entries.push({ holeNumber: h, playerId: 'a1', grossStrokes: 4, isConceded: false });
      entries.push({ holeNumber: h, playerId: 'b1', grossStrokes: 4, isConceded: false });
    }
    for (let h = 13; h <= 15; h++) {
      entries.push({ holeNumber: h, playerId: 'a1', grossStrokes: 3, isConceded: false });
      entries.push({ holeNumber: h, playerId: 'b1', grossStrokes: 5, isConceded: false });
    }

    const state = computeMatchPlayState({
      format: singlesMatchPlay,
      holes: holes18,
      holesCount: 18,
      sides: sidesSingles,
      entries,
    });

    expect(state.status).toBe('in_progress');
    expect(state.isDormie).toBe(true);
    expect(state.holesUp).toBe(3);
    expect(state.thru).toBe(15);
  });

  it('treats a conceded ball as not contributing to the side score, instead of inventing a number', () => {
    const sidesFourBall: [MatchSide, MatchSide] = [
      {
        teamId: 'teamA',
        players: [
          { playerId: 'a1', strokesReceived: 0 },
          { playerId: 'a2', strokesReceived: 0 },
        ],
      },
      {
        teamId: 'teamB',
        players: [
          { playerId: 'b1', strokesReceived: 0 },
          { playerId: 'b2', strokesReceived: 0 },
        ],
      },
    ];

    const entries: PlayerHoleEntry[] = [
      { holeNumber: 1, playerId: 'a1', grossStrokes: null, isConceded: true },
      { holeNumber: 1, playerId: 'a2', grossStrokes: 5, isConceded: false },
      { holeNumber: 1, playerId: 'b1', grossStrokes: 4, isConceded: false },
      { holeNumber: 1, playerId: 'b2', grossStrokes: 6, isConceded: false },
    ];

    const state = computeMatchPlayState({
      format: fourBallNetBestBall,
      holes: holes18,
      holesCount: 18,
      sides: sidesFourBall,
      entries,
    });

    // Side A's only live score is a2's 5; side B's best is b1's 4. B wins the hole.
    expect(state.holeResults[0]).toEqual({ hole: 1, sideAScore: 5, sideBScore: 4, wonBy: 'B' });
  });

  it('returns a typed signal (unallocatedPlayerIds) and scores at gross when a player has missing stroke indexes', () => {
    const holesMissingIndex: ScoringHole[] = holes18.map((h) => ({ ...h, handicapIndex: null }));
    const sides: [MatchSide, MatchSide] = [
      { teamId: 'teamA', players: [{ playerId: 'a1', strokesReceived: 5 }] },
      { teamId: 'teamB', players: [{ playerId: 'b1', strokesReceived: 0 }] },
    ];
    const entries: PlayerHoleEntry[] = [
      { holeNumber: 1, playerId: 'a1', grossStrokes: 4, isConceded: false },
      { holeNumber: 1, playerId: 'b1', grossStrokes: 4, isConceded: false },
    ];

    const state = computeMatchPlayState({
      format: singlesMatchPlay,
      holes: holesMissingIndex,
      holesCount: 18,
      sides,
      entries,
    });

    expect(state.unallocatedPlayerIds).toEqual(['a1']);
    // a1 has 5 strokes owed but no stroke index to allocate them to -- falls back to
    // gross (net === gross) rather than guessing, so the hole halves at 4 gross each.
    expect(state.holeResults[0]).toEqual({ hole: 1, sideAScore: 4, sideBScore: 4, wonBy: 'halved' });
  });

  it('supports a shortened 9-hole match', () => {
    const state = computeMatchPlayState({
      format: singlesMatchPlay,
      holes: holes18,
      holesCount: 9,
      sides: sidesSingles,
      entries: entriesFor(9, 3, 5),
    });

    expect(state.status).toBe('closed_out');
    expect(state.closedOutAtHole).toBeLessThanOrEqual(9);
    expect(state.derivedResult?.winnerTeamId).toBe('teamA');
  });

  it('flags a sparse mid-round card: holes without any entry are not incomplete, holes with partial entry are', () => {
    const entries: PlayerHoleEntry[] = [
      { holeNumber: 1, playerId: 'a1', grossStrokes: 4, isConceded: false },
      { holeNumber: 1, playerId: 'b1', grossStrokes: 4, isConceded: false },
      { holeNumber: 2, playerId: 'a1', grossStrokes: 4, isConceded: false },
      // b1's hole 2 not yet entered.
    ];

    const state = computeMatchPlayState({
      format: singlesMatchPlay,
      holes: holes18,
      holesCount: 18,
      sides: sidesSingles,
      entries,
    });

    expect(state.thru).toBe(1);
    expect(state.incompleteHoles).toEqual([2]);
    expect(state.status).toBe('in_progress');
  });

  it('reports not_started when no entries exist at all', () => {
    const state = computeMatchPlayState({
      format: singlesMatchPlay,
      holes: holes18,
      holesCount: 18,
      sides: sidesSingles,
      entries: [],
    });

    expect(state.status).toBe('not_started');
    expect(state.thru).toBe(0);
    expect(state.resultLabel).toBe('');
    expect(state.derivedResult).toBeNull();
  });
});
