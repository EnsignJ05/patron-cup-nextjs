'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { fetchCourseHoles, type CourseHoleLite } from '@/lib/repositories/courseHoles';
import { fetchMatchHoleScores, fetchMatchScorecard, type MatchHoleScoreLite, type MatchScorecardLite } from '@/lib/repositories/matchScorecards';
import {
  clearMatchHoleScore,
  startMatchScorecard,
  upsertMatchHoleScore,
} from '@/lib/scorecardMutations';
import { allocateStrokes, computeMatchPlayState, getScoringFormatByKey, resolveScoringFormat } from '@/lib/scoring';
import type { MatchSide, PlayerHoleEntry, ScoringHole } from '@/lib/scoring/types';
import { useOfflineScoreQueue } from '@/hooks/useOfflineScoreQueue';
import styles from './page.module.css';

type JoinedMatchPlayer = {
  player_id: string;
  team_id: string;
  handicap_used: number | null;
  strokes_received: number | null;
  player: { id: string; first_name: string; last_name: string } | null;
  team: { id: string; name: string; color: string | null } | null;
};

type MatchRow = {
  id: string;
  course_id: string | null;
  event_id: string | null;
  match_type: string;
  winner_team_id: string | null;
  is_halved: boolean;
  result_set_by_official: boolean;
};

const NUMBER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'PU', '10+', '⌫'];

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

export default function ScorecardPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [matchPlayers, setMatchPlayers] = useState<JoinedMatchPlayer[]>([]);
  const [courseHoles, setCourseHoles] = useState<CourseHoleLite[]>([]);
  const [scorecard, setScorecard] = useState<MatchScorecardLite | null>(null);
  const [holeScores, setHoleScores] = useState<MatchHoleScoreLite[]>([]);

  const [currentHole, setCurrentHole] = useState<number | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<{ resultLabel: string } | null>(null);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError('');

      const matchColumns = 'id, course_id, event_id, match_type, winner_team_id, is_halved, result_set_by_official';
      const playerColumns =
        'player_id, team_id, handicap_used, strokes_received, player:players(id, first_name, last_name), team:teams(id, name, color)';

      const [matchRes, mpRes] = await Promise.all([
        supabase.from('matches').select(matchColumns).eq('id', matchId).single<MatchRow>(),
        supabase.from('match_players').select(playerColumns).eq('match_id', matchId).returns<JoinedMatchPlayer[]>(),
      ]);
      if (cancelled) return;
      if (matchRes.error || !matchRes.data) {
        setLoadError(matchRes.error?.message || 'Match not found');
        setLoading(false);
        return;
      }
      const matchRow = matchRes.data;
      setMatch(matchRow);
      setMatchPlayers(mpRes.data ?? []);

      let scorecardRow = (await fetchMatchScorecard(supabase, matchId)).data ?? null;
      const isLocked = matchRow.result_set_by_official || !!matchRow.winner_team_id || matchRow.is_halved;

      if (!scorecardRow) {
        if (isLocked) {
          setLoadError('This match already has a recorded result.');
          setLoading(false);
          return;
        }
        const startRes = await startMatchScorecard(supabase, { matchId });
        if (cancelled) return;
        if (!startRes.ok) {
          setLoadError(startRes.message);
          setLoading(false);
          return;
        }
        const [mpRes2, scRes2] = await Promise.all([
          supabase.from('match_players').select(playerColumns).eq('match_id', matchId).returns<JoinedMatchPlayer[]>(),
          fetchMatchScorecard(supabase, matchId),
        ]);
        if (cancelled) return;
        setMatchPlayers(mpRes2.data ?? []);
        scorecardRow = scRes2.data ?? null;
      }
      setScorecard(scorecardRow);

      const [holesRes, scoresRes] = await Promise.all([
        matchRow.course_id ? fetchCourseHoles(supabase, matchRow.course_id) : Promise.resolve({ data: [] as CourseHoleLite[] }),
        fetchMatchHoleScores(supabase, matchId),
      ]);
      if (cancelled) return;
      setCourseHoles(holesRes.data ?? []);
      setHoleScores(scoresRes.data ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [matchId, supabase]);

  const holes: ScoringHole[] = useMemo(
    () => courseHoles.map((h) => ({ holeNumber: h.hole_number, par: h.par, handicapIndex: h.handicap_index })),
    [courseHoles],
  );

  const format = useMemo(() => {
    if (scorecard) return getScoringFormatByKey(scorecard.format_key);
    return resolveScoringFormat(match?.match_type ?? '').format;
  }, [scorecard, match?.match_type]);

  const holesCount = scorecard?.holes_count ?? 18;

  const teamIds = useMemo(
    () => Array.from(new Set(matchPlayers.map((mp) => mp.team_id))),
    [matchPlayers],
  );

  const sides: [MatchSide, MatchSide] | null = useMemo(() => {
    if (teamIds.length !== 2) return null;
    return teamIds.map((teamId) => ({
      teamId,
      players: matchPlayers
        .filter((mp) => mp.team_id === teamId)
        .map((mp) => ({ playerId: mp.player_id, strokesReceived: mp.strokes_received ?? 0 })),
    })) as [MatchSide, MatchSide];
  }, [teamIds, matchPlayers]);

  const entries: PlayerHoleEntry[] = useMemo(
    () =>
      holeScores.map((s) => ({
        holeNumber: s.hole_number,
        playerId: s.player_id,
        grossStrokes: s.gross_strokes,
        isConceded: s.is_conceded,
      })),
    [holeScores],
  );

  const scoringState = useMemo(() => {
    if (!sides) return null;
    return computeMatchPlayState({ format, holes, holesCount, sides, entries });
  }, [format, holes, holesCount, sides, entries]);

  const allocationByPlayer = useMemo(() => {
    const map = new Map<string, Map<number, number> | null>();
    matchPlayers.forEach((mp) => {
      const result = allocateStrokes(mp.strokes_received ?? 0, holes);
      map.set(mp.player_id, result.ok ? result.strokesByHole : null);
    });
    return map;
  }, [matchPlayers, holes]);

  const orderedPlayers = useMemo(
    () => teamIds.flatMap((teamId) => matchPlayers.filter((mp) => mp.team_id === teamId)),
    [teamIds, matchPlayers],
  );

  const teamColor = useCallback(
    (teamId: string) => {
      const mp = matchPlayers.find((p) => p.team_id === teamId);
      if (mp?.team?.color) return mp.team.color;
      return teamIds[0] === teamId ? 'var(--pc-team-a)' : 'var(--pc-team-b)';
    },
    [matchPlayers, teamIds],
  );

  const teamName = useCallback(
    (teamId: string) => matchPlayers.find((p) => p.team_id === teamId)?.team?.name ?? 'Team',
    [matchPlayers],
  );

  const findFirstUnfilled = useCallback(
    (hole: number) =>
      orderedPlayers.find(
        (mp) => !entries.some((e) => e.holeNumber === hole && e.playerId === mp.player_id && (e.grossStrokes != null || e.isConceded)),
      )?.player_id ?? null,
    [orderedPlayers, entries],
  );

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !scoringState || loading) return;
    initializedRef.current = true;
    const startHole = Math.min(holesCount, scoringState.thru + 1);
    setCurrentHole(startHole);
    setActivePlayerId(findFirstUnfilled(startHole));
  }, [scoringState, loading, holesCount, findFirstUnfilled]);

  const savingRef = useRef(false);
  const offlineQueue = useOfflineScoreQueue(matchId, supabase);

  const applyLocalEntry = (holeNumber: number, playerId: string, grossStrokes: number | null, isConceded: boolean) => {
    setHoleScores((prev) => {
      const next = prev.filter((s) => !(s.hole_number === holeNumber && s.player_id === playerId));
      if (grossStrokes != null || isConceded) {
        next.push({
          match_id: matchId,
          hole_number: holeNumber,
          player_id: playerId,
          gross_strokes: grossStrokes,
          is_conceded: isConceded,
          entered_by_player_id: '',
          updated_at: new Date().toISOString(),
        });
      }
      return next;
    });
  };

  const handleKey = async (key: string) => {
    if (!activePlayerId || currentHole == null || savingRef.current) return;
    savingRef.current = true;
    setSaveError('');

    const isConceded = key === 'PU';
    const isClear = key === '⌫';
    const grossStrokes = isClear || isConceded ? null : key === '10+' ? 10 : Number(key);

    applyLocalEntry(currentHole, activePlayerId, grossStrokes, isConceded);

    // Clearing a cell has no offline-queue equivalent (the batch RPC only upserts) --
    // it's a correction, not new data, so it's immediate-only. Everything else is
    // durably queued first (Task P7.1) so a dead connection can't lose a tapped score.
    if (!isClear) {
      offlineQueue.enqueue({
        hole_number: currentHole,
        player_id: activePlayerId,
        gross_strokes: grossStrokes,
        is_conceded: isConceded,
      });
    }

    const result = isClear
      ? await clearMatchHoleScore(supabase, { matchId, holeNumber: currentHole, playerId: activePlayerId })
      : await upsertMatchHoleScore(supabase, {
          matchId,
          holeNumber: currentHole,
          playerId: activePlayerId,
          grossStrokes,
          isConceded,
        });

    savingRef.current = false;
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    if (!isClear) {
      offlineQueue.confirmSent({ hole_number: currentHole, player_id: activePlayerId });
    }

    if (!isClear) {
      const idx = orderedPlayers.findIndex((p) => p.player_id === activePlayerId);
      const order = [1, 2, 3, 0].map((o) => orderedPlayers[(idx + o) % orderedPlayers.length]?.player_id);
      const next = order.find(
        (pid) =>
          pid &&
          !entries.some((e) => e.holeNumber === currentHole && e.playerId === pid && (e.grossStrokes != null || e.isConceded)) &&
          pid !== activePlayerId,
      );
      setActivePlayerId(next ?? null);
    }
  };

  const goToHole = (hole: number) => {
    if (hole < 1 || hole > holesCount) return;
    setCurrentHole(hole);
    setActivePlayerId(findFirstUnfilled(hole));
    setSheetOpen(false);
  };

  const handleDispute = async () => {
    const res = await fetch(`/api/matches/${matchId}/dispute`, { method: 'POST' });
    if (res.ok) setDisputeSubmitted(true);
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    setSaveError('');
    try {
      const remaining = await offlineQueue.flush();
      if (remaining > 0) {
        setSaveError(`${remaining} score${remaining === 1 ? '' : 's'} haven't synced yet -- check your connection and try again.`);
        return;
      }
      const res = await fetch(`/api/matches/${matchId}/finalize`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        if (body.incompleteHoles?.length) {
          goToHole(body.incompleteHoles[0]);
          setSaveError(`Hole ${body.incompleteHoles[0]} is missing a score.`);
        } else {
          setSaveError(body.error || 'Could not finalize this match.');
        }
        return;
      }
      setFinalizeResult({ resultLabel: body.resultLabel });
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return <div className={styles.wrap} style={{ padding: 24, color: 'var(--pc-ink-3)' }}>Loading…</div>;
  }

  if (loadError || !match || !sides || !scoringState || currentHole == null) {
    return (
      <div className={styles.wrap}>
        <div className={styles.topbar}>
          <Link href="/dashboard" className={styles.backBtn} aria-label="Back">←</Link>
          <span className={styles.topbarTitle}>SCORECARD</span>
          <span />
        </div>
        <div className={styles.errorBanner}>{loadError || 'Could not load this match for scoring.'}</div>
      </div>
    );
  }

  const noCourseData = courseHoles.length === 0;
  const hole = courseHoles.find((h) => h.hole_number === currentHole);
  const holeResult = scoringState.holeResults[currentHole - 1];
  const isReview = scoringState.status === 'closed_out' || scoringState.status === 'complete';

  if (isReview) {
    const finalLabel = finalizeResult?.resultLabel ?? scoringState.resultLabel;
    const isFinal = scorecard?.status === 'final' || !!finalizeResult;
    return (
      <div className={styles.wrap}>
        <div className={styles.topbar}>
          <Link href="/dashboard" className={styles.backBtn} aria-label="Back">←</Link>
          <span className={styles.topbarTitle}>REVIEW</span>
          <span />
        </div>
        <div className={styles.reviewWrap}>
          <div className={styles.resultLabel}>{finalLabel}</div>
          <div className={styles.reviewGrid}>
            <div className={`${styles.reviewRow} ${styles.reviewHead}`}>
              <span className={styles.reviewLabel}>Hole</span>
              <span className={styles.reviewLabel}>Par</span>
              <span className={styles.reviewLabel} style={{ textAlign: 'center' }}>A</span>
              <span className={styles.reviewLabel} style={{ textAlign: 'center' }}>B</span>
              <span className={styles.reviewLabel} style={{ textAlign: 'right' }}>Result</span>
            </div>
            {scoringState.holeResults.map((r) => {
              const courseHole = courseHoles.find((h) => h.hole_number === r.hole);
              return (
                <div key={r.hole} className={styles.reviewRow}>
                  <span style={{ fontFamily: 'var(--pc-font-mono)', fontWeight: 700 }}>{r.hole}</span>
                  <span style={{ fontFamily: 'var(--pc-font-mono)', color: 'var(--pc-ink-3)' }}>
                    {courseHole?.par ?? '–'}
                  </span>
                  <span style={{ textAlign: 'center', fontFamily: 'var(--pc-font-mono)' }}>{r.sideAScore ?? '–'}</span>
                  <span style={{ textAlign: 'center', fontFamily: 'var(--pc-font-mono)' }}>{r.sideBScore ?? '–'}</span>
                  <span style={{ textAlign: 'right', fontSize: 11, fontWeight: 700 }}>
                    {r.wonBy === 'halved' ? 'Halved' : r.wonBy ? (r.wonBy === 'A' ? 'A' : 'B') : ''}
                  </span>
                </div>
              );
            })}
          </div>
          {saveError && <div className={styles.errorBanner}>{saveError}</div>}
          {!isFinal ? (
            <button type="button" className={styles.cta} onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? 'Finalizing…' : 'Finalize match'}
            </button>
          ) : disputeSubmitted ? (
            <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--pc-ink-3)' }}>
              Flagged for committee review.
            </div>
          ) : (
            <button type="button" className={styles.disputeBtn} onClick={handleDispute}>
              Flag for committee review
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <Link href="/dashboard" className={styles.backBtn} aria-label="Back">←</Link>
        <span className={styles.topbarTitle}>LIVE SCORING</span>
        {offlineQueue.pendingCount > 0 ? (
          <span className={styles.unsyncedPill}>{offlineQueue.pendingCount} unsynced</span>
        ) : (
          <span className={styles.livePill}><i className={styles.dot} />LIVE</span>
        )}
      </div>

      <div className={styles.holeStrip}>
        {Array.from({ length: holesCount }).map((_, i) => {
          const n = i + 1;
          const saved = scoringState.holeResults[i]?.wonBy != null;
          return (
            <button
              key={n}
              type="button"
              className={`${styles.holeStripCell} ${saved ? styles.saved : ''} ${n === currentHole ? styles.current : ''}`}
              onClick={() => goToHole(n)}
              aria-label={`Hole ${n}`}
            />
          );
        })}
      </div>

      <div className={styles.holeNav}>
        <button type="button" className={styles.navBtn} disabled={currentHole === 1} onClick={() => goToHole(currentHole - 1)}>
          ←
        </button>
        <button type="button" className={styles.holeCenter} onClick={() => setSheetOpen(true)}>
          <div>
            <div className={styles.holeLabel}>Hole</div>
            <div className={styles.holeNumber}>{currentHole}</div>
          </div>
          <div className={styles.holeMeta}>
            <div className={styles.holeMetaItem}>
              <div className={styles.holeLabel}>Par</div>
              <div className={styles.holeMetaValue}>{hole?.par ?? '–'}</div>
            </div>
            <div className={styles.holeMetaItem}>
              <div className={styles.holeLabel}>Yards</div>
              <div className={styles.holeMetaValue}>{hole?.yardage ?? '–'}</div>
            </div>
            <div className={styles.holeMetaItem}>
              <div className={styles.holeLabel}>SI</div>
              <div className={styles.holeMetaValue}>{hole?.handicap_index ?? '–'}</div>
            </div>
          </div>
        </button>
        <button
          type="button"
          className={styles.navBtn}
          disabled={currentHole === holesCount}
          onClick={() => goToHole(currentHole + 1)}
        >
          →
        </button>
      </div>

      {noCourseData && (
        <div className={styles.missingDataBanner}>
          This course doesn&apos;t have hole data entered yet, so scores are gross only.{' '}
          {match.course_id && <Link href={`/admin/courses/${match.course_id}/holes`}>Add it</Link>}
        </div>
      )}

      {saveError && <div className={styles.errorBanner}>{saveError}</div>}

      <div className={styles.playerList}>
        {orderedPlayers.map((mp) => {
          const entry = entries.find((e) => e.holeNumber === currentHole && e.playerId === mp.player_id);
          const alloc = allocationByPlayer.get(mp.player_id);
          const strokes = alloc ? alloc.get(currentHole) ?? 0 : 0;
          const net = entry?.grossStrokes != null ? entry.grossStrokes - strokes : null;
          const name = mp.player ? `${mp.player.first_name} ${mp.player.last_name}` : 'Player';
          const ini = mp.player ? initials(mp.player.first_name, mp.player.last_name) : '--';

          return (
            <button
              key={mp.player_id}
              type="button"
              className={`${styles.playerRow} ${activePlayerId === mp.player_id ? styles.active : ''}`}
              onClick={() => setActivePlayerId(mp.player_id)}
            >
              <div className={styles.playerInfo}>
                <div className={styles.avatarWrap}>
                  <div className={styles.avatar}>{ini}</div>
                  <span className={styles.teamChip} style={{ background: teamColor(mp.team_id) }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.playerName}>{name}</div>
                  <div className={styles.playerMeta}>
                    <span className={styles.hcpLabel}>HCP {mp.handicap_used ?? '–'}</span>
                    {strokes > 0 ? (
                      <>
                        <span className={styles.strokeDots}>
                          {Array.from({ length: strokes }).map((_, i) => (
                            <i key={i} className={styles.strokeDot} />
                          ))}
                        </span>
                        <span className={styles.strokeLabel}>{strokes === 1 ? 'Stroke' : `${strokes} strokes`}</span>
                      </>
                    ) : (
                      <span className={styles.noStroke}>No stroke</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.netCol}>
                {net != null && strokes > 0 && (
                  <>
                    <div className={styles.netLabel}>Net</div>
                    <div className={styles.netValue}>{net}</div>
                  </>
                )}
              </div>
              <div className={styles.scoreBox}>
                {entry?.isConceded ? (
                  <span className={styles.scoreValuePickup}>PU</span>
                ) : entry?.grossStrokes != null ? (
                  <span className={styles.scoreValue}>{entry.grossStrokes}</span>
                ) : (
                  <span className={styles.scoreEmpty}>–</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className={styles.verdict}>
        {holeResult?.wonBy != null ? (
          <>
            <span className={styles.verdictScoreA}>{holeResult.sideAScore}</span>
            <span className={styles.holeLabel}>
              {holeResult.wonBy === 'halved'
                ? 'Halved'
                : `${teamName(holeResult.wonBy === 'A' ? teamIds[0] : teamIds[1])} wins hole`}
            </span>
            <span className={styles.verdictScoreB}>{holeResult.sideBScore}</span>
          </>
        ) : (
          <span className={styles.verdictScoring}>
            Scoring <b style={{ color: 'var(--pc-ink)' }}>
              {(() => {
                const p = orderedPlayers.find((mp) => mp.player_id === activePlayerId)?.player;
                return p ? `${p.first_name} ${p.last_name}` : '…';
              })()}
            </b>
          </span>
        )}
      </div>

      <div className={styles.padWrap}>
        <div className={styles.pad}>
          {NUMBER_KEYS.map((k) => (
            <div
              key={k}
              className={`${styles.padKey} ${k.length > 1 || k === '⌫' ? styles.padKeySmall : ''}`}
              onClick={() => handleKey(k)}
            >
              {k}
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.cta}
          disabled={holeResult?.wonBy == null}
          onClick={() => goToHole(currentHole + 1)}
        >
          {holeResult?.wonBy != null ? 'Next hole' : 'Enter all scores'}
        </button>
      </div>

      {sheetOpen && (
        <div className={styles.sheetOverlay} onClick={() => setSheetOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetGrab} />
            <div className={styles.sheetHeader}>
              <span className={styles.sheetTitle}>Jump to hole</span>
              <span className={styles.holeLabel}>{scoringState.thru} of {holesCount} saved</span>
            </div>
            <div className={styles.sheetGrid}>
              {Array.from({ length: holesCount }).map((_, i) => {
                const n = i + 1;
                const saved = scoringState.holeResults[i]?.wonBy != null;
                const isCurrent = n === currentHole;
                const courseHole = courseHoles.find((h) => h.hole_number === n);
                return (
                  <div
                    key={n}
                    onClick={() => goToHole(n)}
                    className={`${styles.sheetHole} ${saved ? styles.saved : ''} ${isCurrent ? styles.current : ''}`}
                  >
                    <span className={styles.sheetHoleNum}>{n}</span>
                    <span className={styles.sheetHoleSub}>{saved ? '✓' : courseHole ? `P${courseHole.par}` : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
