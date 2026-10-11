'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { fetchMatchHoleScores, fetchMatchScorecard } from '@/lib/repositories/matchScorecards';
import styles from './KeepScoreEntry.module.css';

export type KeepScoreEntryProps = {
  matchId: string;
  winnerTeamId: string | null;
  isHalved: boolean;
  resultSetByOfficial: boolean;
  participantPlayerIds: string[];
  currentPlayerId: string;
};

/**
 * Entry point into the live scorecard (LIVE_SCORING_PLAN.md Task P4.1). Anyone in
 * the group can keep score (decision 2.3), so this shows for every participant, not
 * just the player viewing it.
 */
export default function KeepScoreEntry({
  matchId,
  winnerTeamId,
  isHalved,
  resultSetByOfficial,
  participantPlayerIds,
  currentPlayerId,
}: KeepScoreEntryProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [label, setLabel] = useState<string | null>(null);

  const eligible =
    !winnerTeamId && !isHalved && !resultSetByOfficial && participantPlayerIds.includes(currentPlayerId);

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    (async () => {
      const scorecardRes = await fetchMatchScorecard(supabase, matchId);
      if (cancelled) return;
      if (!scorecardRes.data) {
        setLabel('Start scoring');
        return;
      }
      if (scorecardRes.data.status === 'final') {
        setLabel(null);
        return;
      }
      const holesRes = await fetchMatchHoleScores(supabase, matchId);
      if (cancelled) return;
      const maxHole = (holesRes.data ?? []).reduce((m, r) => Math.max(m, r.hole_number), 0);
      const nextHole = Math.min(scorecardRes.data.holes_count, maxHole + 1);
      setLabel(`Continue scoring · Hole ${nextHole}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, matchId, supabase]);

  if (!eligible || !label) return null;

  return (
    <>
      <Link href={`/dashboard/scorecard/${matchId}`} className={styles.cta}>
        <i className={styles.dot} />
        <span>{label}</span>
      </Link>
      <div className={styles.caption}>Anyone in the group can keep score.</div>
    </>
  );
}
