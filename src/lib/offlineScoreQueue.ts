import type { BatchHoleScoreEntry } from './scorecardMutations';

/**
 * Pure queue manipulation for the offline write queue (LIVE_SCORING_PLAN.md Task
 * P7.1). No localStorage/network access here -- the useOfflineScoreQueue hook owns
 * that I/O and calls these functions, which is what keeps this module unit-testable.
 */

export function localStorageKeyForMatch(matchId: string): string {
  return `pc-offline-scores:${matchId}`;
}

const entryKey = (e: Pick<BatchHoleScoreEntry, 'hole_number' | 'player_id'>) => `${e.hole_number}:${e.player_id}`;

/** Collapses a repeated tap on the same cell to the single latest value. */
export function upsertQueueEntry(
  queue: BatchHoleScoreEntry[],
  entry: BatchHoleScoreEntry,
): BatchHoleScoreEntry[] {
  const key = entryKey(entry);
  const next = queue.filter((e) => entryKey(e) !== key);
  next.push(entry);
  return next;
}

/** Removes entries that match what was just sent exactly -- an entry re-queued by a
 * newer tap during the flush (different value) won't match and correctly survives. */
export function removeSentEntries(
  queue: BatchHoleScoreEntry[],
  sent: BatchHoleScoreEntry[],
): BatchHoleScoreEntry[] {
  const sentKeys = new Set(
    sent.map((e) => `${entryKey(e)}:${e.gross_strokes ?? ''}:${e.is_conceded}`),
  );
  return queue.filter((e) => !sentKeys.has(`${entryKey(e)}:${e.gross_strokes ?? ''}:${e.is_conceded}`));
}

/** Removes a single cell from the queue outright (used after a successful immediate
 * write, so the offline queue doesn't re-send something already persisted). */
export function removeQueueEntry(
  queue: BatchHoleScoreEntry[],
  target: Pick<BatchHoleScoreEntry, 'hole_number' | 'player_id'>,
): BatchHoleScoreEntry[] {
  const key = entryKey(target);
  return queue.filter((e) => entryKey(e) !== key);
}
