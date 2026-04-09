/**
 * Match format rules for committee setup (capacity per tee-time swim lane).
 */

export type MatchFormatConfig = {
  playersPerTeam: number;
  matchesPerGroup: number;
  isUnknown: boolean;
};

const normalizeMatchType = (matchType: string) =>
  matchType.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function getFormatConfig(matchType: string): MatchFormatConfig {
  const normalized = normalizeMatchType(matchType);
  if (normalized.includes('two man better ball') || normalized.includes('betterball')) {
    return { playersPerTeam: 2, matchesPerGroup: 1, isUnknown: false };
  }
  if (normalized.includes('head to head') || normalized.includes('h2h') || normalized.includes('singles')) {
    return { playersPerTeam: 1, matchesPerGroup: 2, isUnknown: false };
  }
  return { playersPerTeam: 2, matchesPerGroup: 1, isUnknown: true };
}

/** Players used by one match (two teams × players per team). */
export function getMatchPlayerCount(matchType: string): number {
  const { playersPerTeam } = getFormatConfig(matchType);
  return 2 * playersPerTeam;
}

const MAX_PLAYERS_PER_SWIM_LANE = 4;

export function slotPlayerTotalForMatchTypes(matchTypes: string[]): number {
  return matchTypes.reduce((sum, t) => sum + getMatchPlayerCount(t), 0);
}

export function isSlotWithinCapacity(matchTypes: string[]): boolean {
  return slotPlayerTotalForMatchTypes(matchTypes) <= MAX_PLAYERS_PER_SWIM_LANE;
}

/** Normalize DB/API time strings for equality (e.g. 09:00 vs 09:00:00). */
export function normalizeMatchTimeForCompare(time: string | null): string | null {
  if (time === null || time === undefined) return null;
  const t = String(time).trim();
  if (t.length === 5 && /^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

export function matchTimesEqual(a: string | null, b: string | null): boolean {
  return normalizeMatchTimeForCompare(a) === normalizeMatchTimeForCompare(b);
}
