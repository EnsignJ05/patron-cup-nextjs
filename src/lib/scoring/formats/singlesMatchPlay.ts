import type { ScoringFormat } from '../types';

/** Head to Head: the side is one player, so the side's hole score is just that
 * player's net score (or null if they haven't entered one, or picked up). */
export const singlesMatchPlay: ScoringFormat = {
  key: 'singles_match_play',
  label: 'Head to Head',
  playersPerTeam: 1,
  defaultAllowance: 1.0,
  compare: 'lower-is-better',
  scoreSideHole(entries) {
    const entry = entries[0];
    return entry && !entry.isConceded && entry.net != null ? entry.net : null;
  },
};
