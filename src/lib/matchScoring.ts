import type { Match } from '@/types/database';

type MatchResult = Pick<Match, 'winner_team_id' | 'is_halved'>;

export const getMatchPointsForTeam = (match: MatchResult, teamId: string): number => {
  if (match.is_halved) return 0.5;
  if (!match.winner_team_id) return 0;
  return match.winner_team_id === teamId ? 1 : 0;
};

export const getTeamTotals = (matches: MatchResult[], teamIds: string[]) => {
  return teamIds.reduce<Record<string, number>>((totals, teamId) => {
    const points = matches.reduce((sum, match) => sum + getMatchPointsForTeam(match, teamId), 0);
    totals[teamId] = points;
    return totals;
  }, {});
};
