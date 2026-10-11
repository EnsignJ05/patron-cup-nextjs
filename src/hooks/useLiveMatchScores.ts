'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { fetchCourseHoles } from '@/lib/repositories/courseHoles';
import { fetchEventMatchHoleScores, fetchEventMatchScorecards } from '@/lib/repositories/matchScorecards';
import { buildLiveMatchStates, type LiveMatchPlayerRow } from '@/lib/scoring/buildLiveMatchStates';
import type { MatchPlayStateWithAllocation } from '@/lib/scoring/matchPlay';
import type { ScoringHole } from '@/lib/scoring/types';

const POLL_INTERVAL_MS = 30000;

export type UseLiveMatchScoresInput = {
  eventId: string;
  matchIds: string[];
  matchPlayers: LiveMatchPlayerRow[];
};

export type UseLiveMatchScoresResult = {
  statesByMatchId: Map<string, MatchPlayStateWithAllocation>;
  /** False for a signed-out visitor -- RLS returns zero rows for them (Task P3.2),
   * which this hook treats as a normal state, never an error. */
  isAuthorized: boolean;
  lastUpdatedAt: Date | null;
};

/**
 * Live scoreboard data for Task P5.1/P5.2. No realtime subscription yet -- just the
 * "always run a polling fallback" half of the spec (refetch every 30s, plus on
 * visibilitychange/online), which is honest to ship alone and never silently stops
 * updating. Realtime (postgres_changes) is a documented follow-up, not implemented here.
 */
export function useLiveMatchScores({ eventId, matchIds, matchPlayers }: UseLiveMatchScoresInput): UseLiveMatchScoresResult {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [statesByMatchId, setStatesByMatchId] = useState<Map<string, MatchPlayStateWithAllocation>>(new Map());
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const courseHolesCacheRef = useRef<Map<string, ScoringHole[]>>(new Map());
  const matchIdsKey = matchIds.join(',');

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setIsAuthorized(!!data.session);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (!eventId || matchIds.length === 0) return;

    const [scorecardsRes, holeScoresRes] = await Promise.all([
      fetchEventMatchScorecards(supabase, eventId),
      fetchEventMatchHoleScores(supabase, matchIds),
    ]);
    const scorecards = scorecardsRes.data ?? [];

    const missingCourseIds = Array.from(
      new Set(scorecards.map((s) => s.course_id).filter((id): id is string => !!id && !courseHolesCacheRef.current.has(id))),
    );
    await Promise.all(
      missingCourseIds.map(async (courseId) => {
        const res = await fetchCourseHoles(supabase, courseId);
        courseHolesCacheRef.current.set(
          courseId,
          (res.data ?? []).map((h) => ({ holeNumber: h.hole_number, par: h.par, handicapIndex: h.handicap_index })),
        );
      }),
    );

    const next = buildLiveMatchStates({
      scorecards,
      holeScores: holeScoresRes.data ?? [],
      matchPlayers,
      holesByCourseId: courseHolesCacheRef.current,
    });
    setStatesByMatchId(next);
    setLastUpdatedAt(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matchPlayers is an array literal from the caller; matchIdsKey is the stable identity for matchIds.
  }, [eventId, matchIdsKey, supabase]);

  useEffect(() => {
    if (!isAuthorized) {
      setStatesByMatchId(new Map());
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
    };
  }, [isAuthorized, refresh]);

  return { statesByMatchId, isAuthorized, lastUpdatedAt };
}
