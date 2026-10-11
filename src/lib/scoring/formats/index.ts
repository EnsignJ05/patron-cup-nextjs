import { normalizeMatchType } from '@/lib/matchFormatConfig';
import type { ScoringFormat } from '../types';
import { fourBallNetBestBall } from './fourBallNetBestBall';
import { singlesMatchPlay } from './singlesMatchPlay';

const FORMATS: ScoringFormat[] = [fourBallNetBestBall, singlesMatchPlay];

/** Safe fallback for an unrecognized match_type -- the UI surfaces `isUnknown`
 * rather than silently scoring the match wrong. */
const UNKNOWN_FORMAT: ScoringFormat = {
  key: 'unknown',
  label: 'Unknown format',
  playersPerTeam: 2,
  defaultAllowance: 1.0,
  compare: 'lower-is-better',
  scoreSideHole: () => null,
};

export function listScoringFormats(): ScoringFormat[] {
  return FORMATS;
}

/** Looks up a format by the key a scorecard pinned at start_match_scorecard time
 * (Task P3.1/P3.3), rather than re-deriving it from matches.match_type -- a later
 * rename of the match type shouldn't change how an in-progress scorecard is scored. */
export function getScoringFormatByKey(formatKey: string): ScoringFormat {
  return FORMATS.find((f) => f.key === formatKey) ?? UNKNOWN_FORMAT;
}

export function resolveScoringFormat(matchType: string): { format: ScoringFormat; isUnknown: boolean } {
  const normalized = normalizeMatchType(matchType);
  if (normalized.includes('two man better ball') || normalized.includes('betterball')) {
    return { format: fourBallNetBestBall, isUnknown: false };
  }
  if (normalized.includes('head to head') || normalized.includes('h2h') || normalized.includes('singles')) {
    return { format: singlesMatchPlay, isUnknown: false };
  }
  return { format: UNKNOWN_FORMAT, isUnknown: true };
}

export { fourBallNetBestBall, singlesMatchPlay };
