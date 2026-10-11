import type { ScoringFormat } from '../types';

/** Two Man Better Ball: each side's hole score is the lower of its two players' net
 * scores, ignoring players who didn't enter a score or who picked up. */
export const fourBallNetBestBall: ScoringFormat = {
  key: 'four_ball_net_best_ball',
  label: 'Two Man Better Ball',
  playersPerTeam: 2,
  defaultAllowance: 1.0,
  compare: 'lower-is-better',
  scoreSideHole(entries) {
    const nets = entries.filter((e) => !e.isConceded && e.net != null).map((e) => e.net as number);
    return nets.length ? Math.min(...nets) : null;
  },
};
