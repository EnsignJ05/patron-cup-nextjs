'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { localStorageKeyForMatch, removeQueueEntry, removeSentEntries, upsertQueueEntry } from '@/lib/offlineScoreQueue';
import { upsertMatchHoleScoresBatch, type BatchHoleScoreEntry } from '@/lib/scorecardMutations';

/**
 * Durable backup for hole-score writes (Task P7.1). The scorecard page's primary
 * path is still one RPC call per tap (upsertMatchHoleScore) for a fast response when
 * online; this queue is what survives a dead connection: every tap is persisted to
 * localStorage immediately, and a cell is cleared from the queue only once it's
 * confirmed written -- by the immediate call succeeding, or by this queue's own
 * batch flush on reconnect.
 */
export function useOfflineScoreQueue(matchId: string, supabase: SupabaseClient) {
  const storageKey = localStorageKeyForMatch(matchId);
  const [queue, setQueue] = useState<BatchHoleScoreEntry[]>([]);
  const [flushing, setFlushing] = useState(false);
  const queueRef = useRef<BatchHoleScoreEntry[]>([]);

  const persist = useCallback(
    (next: BatchHoleScoreEntry[]) => {
      queueRef.current = next;
      setQueue(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Private browsing / quota exceeded -- the in-memory queue still works for
        // this session, it just won't survive a reload.
      }
    },
    [storageKey],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as BatchHoleScoreEntry[];
        queueRef.current = parsed;
        setQueue(parsed);
      }
    } catch {
      // Corrupt or inaccessible storage -- start with an empty queue.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per mount; storageKey is derived from the stable matchId prop.
  }, []);

  const enqueue = useCallback(
    (entry: BatchHoleScoreEntry) => {
      persist(upsertQueueEntry(queueRef.current, entry));
    },
    [persist],
  );

  /** Call after an immediate single-cell write succeeds, so the queue doesn't
   * re-send something already persisted. */
  const confirmSent = useCallback(
    (target: Pick<BatchHoleScoreEntry, 'hole_number' | 'player_id'>) => {
      persist(removeQueueEntry(queueRef.current, target));
    },
    [persist],
  );

  /** Returns the number of cells still unsynced after the attempt (0 = clean). */
  const flush = useCallback(async (): Promise<number> => {
    if (queueRef.current.length === 0) return 0;
    if (flushing) return queueRef.current.length;
    setFlushing(true);
    const toSend = queueRef.current;
    const result = await upsertMatchHoleScoresBatch(supabase, { matchId, entries: toSend });
    setFlushing(false);
    if (result.ok) {
      persist(removeSentEntries(queueRef.current, toSend));
    }
    return queueRef.current.length;
  }, [flushing, matchId, supabase, persist]);

  useEffect(() => {
    flush();
    const onOnline = () => flush();
    const onVisible = () => {
      if (document.visibilityState === 'visible') flush();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [flush]);

  return { pendingCount: queue.length, enqueue, confirmSent, flush, flushing };
}
