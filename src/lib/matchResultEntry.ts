import type { MatchResultsPending } from '@/types/database';

/** Normalize DB time strings (HH:mm or HH:mm:ss) for ISO datetime parsing. */
export function normalizeMatchTimeForSchedule(matchTime: string | null): string {
  if (!matchTime || !matchTime.trim()) {
    return '00:00:00';
  }
  const t = matchTime.trim();
  return t.length === 5 ? `${t}:00` : t;
}

/**
 * Whether the current time is at or after the match scheduled start (local timezone).
 * If `match_time` is null, start of `match_date` (midnight local) is used.
 */
export function isPastScheduledStart(
  matchDate: string,
  matchTime: string | null,
  now: Date = new Date(),
): boolean {
  const timePart = normalizeMatchTimeForSchedule(matchTime);
  const start = new Date(`${matchDate}T${timePart}`);
  if (Number.isNaN(start.getTime())) {
    return false;
  }
  return now.getTime() >= start.getTime();
}

export type PendingViewerRole = 'proposer' | 'confirmer' | 'viewer';

/**
 * Who the current player is relative to a pending proposal (same match).
 * `participantIds` = all player ids assigned to this match (both teams).
 */
export function getViewerRoleForPendingProposal(
  pending: Pick<MatchResultsPending, 'proposed_by_player_id' | 'status'> | null,
  currentPlayerId: string,
  participantIds: string[],
): PendingViewerRole {
  if (!pending || pending.status !== 'pending') {
    return 'viewer';
  }
  if (pending.proposed_by_player_id === currentPlayerId) {
    return 'proposer';
  }
  const others = participantIds.filter((id) => id !== pending.proposed_by_player_id);
  if (others.includes(currentPlayerId)) {
    return 'confirmer';
  }
  return 'viewer';
}
