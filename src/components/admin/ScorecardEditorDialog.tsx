'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { fetchCourseHoles, type CourseHoleLite } from '@/lib/repositories/courseHoles';
import {
  fetchMatchHoleScores,
  fetchMatchScorecard,
  type MatchHoleScoreLite,
  type MatchScorecardLite,
} from '@/lib/repositories/matchScorecards';
import {
  clearMatchHoleScore,
  resolveMatchScorecardDispute,
  setMatchScorecardFormat,
  setMatchScorecardStatus,
  startMatchScorecard,
  upsertMatchHoleScore,
} from '@/lib/scorecardMutations';
import { setOfficialMatchResult } from '@/lib/matchResultMutations';
import { computeMatchPlayState, getScoringFormatByKey, listScoringFormats } from '@/lib/scoring';
import type { MatchSide, PlayerHoleEntry, ScoringHole } from '@/lib/scoring/types';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './ScorecardEditorDialog.module.css';

export type ScorecardEditorPlayer = {
  player_id: string;
  team_id: string;
  name: string;
  strokes_received: number | null;
};

export type ScorecardEditorDialogProps = {
  open: boolean;
  onClose: () => void;
  matchId: string;
  matchNumber: number;
  courseId: string | null;
  players: ScorecardEditorPlayer[];
  /** Called after a mutation that may have changed the official result, so the
   * parent page's match list stays in sync. */
  onChanged: () => void;
};

/**
 * Committee tooling for a single match's live scorecard (LIVE_SCORING_PLAN.md Task
 * P6.1-P6.3): view/edit any hole for any player, reopen a final card, mark a
 * washed-out round abandoned, resolve a dispute, change the format/allowance, and
 * settle the match as of an earlier hole.
 */
export default function ScorecardEditorDialog({
  open,
  onClose,
  matchId,
  matchNumber,
  courseId,
  players,
  onChanged,
}: ScorecardEditorDialogProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scorecard, setScorecard] = useState<MatchScorecardLite | null>(null);
  const [holeScores, setHoleScores] = useState<MatchHoleScoreLite[]>([]);
  const [courseHoles, setCourseHoles] = useState<CourseHoleLite[]>([]);
  const [formatKey, setFormatKey] = useState('');
  const [allowance, setAllowance] = useState('1.0');
  const [settleHole, setSettleHole] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [scorecardRes, holesRes, courseHolesRes] = await Promise.all([
      fetchMatchScorecard(supabase, matchId),
      fetchMatchHoleScores(supabase, matchId),
      courseId ? fetchCourseHoles(supabase, courseId) : Promise.resolve({ data: [] as CourseHoleLite[] }),
    ]);
    setScorecard(scorecardRes.data ?? null);
    setHoleScores(holesRes.data ?? []);
    setCourseHoles(courseHolesRes.data ?? []);
    if (scorecardRes.data) {
      setFormatKey(scorecardRes.data.format_key);
      setAllowance(String(scorecardRes.data.handicap_allowance));
    }
    setLoading(false);
  }, [supabase, matchId, courseId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const sides: [MatchSide, MatchSide] | null = useMemo(() => {
    const teamIds = Array.from(new Set(players.map((p) => p.team_id)));
    if (teamIds.length !== 2) return null;
    return teamIds.map((teamId) => ({
      teamId,
      players: players
        .filter((p) => p.team_id === teamId)
        .map((p) => ({ playerId: p.player_id, strokesReceived: p.strokes_received ?? 0 })),
    })) as [MatchSide, MatchSide];
  }, [players]);

  const holes: ScoringHole[] = useMemo(
    () => courseHoles.map((h) => ({ holeNumber: h.hole_number, par: h.par, handicapIndex: h.handicap_index })),
    [courseHoles],
  );

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

  const holesCount = scorecard?.holes_count ?? 18;

  const state = useMemo(() => {
    if (!scorecard || !sides) return null;
    const format = getScoringFormatByKey(scorecard.format_key);
    return computeMatchPlayState({ format, holes, holesCount, sides, entries });
  }, [scorecard, sides, holes, holesCount, entries]);

  const handleStart = async () => {
    setBusy(true);
    setError('');
    const res = await startMatchScorecard(supabase, { matchId });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    load();
  };

  const handleSaveFormat = async () => {
    setBusy(true);
    setError('');
    const res = await setMatchScorecardFormat(supabase, {
      matchId,
      formatKey,
      handicapAllowance: parseFloat(allowance) || 1.0,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    load();
  };

  const handleSetStatus = async (status: 'in_progress' | 'final' | 'abandoned') => {
    setBusy(true);
    setError('');
    const res = await setMatchScorecardStatus(supabase, { matchId, status });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    load();
    onChanged();
  };

  const handleResolveDispute = async () => {
    setBusy(true);
    setError('');
    const res = await resolveMatchScorecardDispute(supabase, { matchId });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    load();
  };

  const handleSettle = async () => {
    const through = parseInt(settleHole, 10);
    if (!sides || !scorecard || !through || through < 1 || through > holesCount) return;
    setBusy(true);
    setError('');
    const format = getScoringFormatByKey(scorecard.format_key);
    const settled = computeMatchPlayState({ format, holes, holesCount: through, sides, entries });
    if (!settled.derivedResult) {
      setBusy(false);
      setError(`Match isn't decided yet through hole ${through}.`);
      return;
    }
    const value = settled.derivedResult.isHalved ? 'halved' : settled.derivedResult.winnerTeamId ?? '';
    const res = await setOfficialMatchResult(supabase, { matchId, value });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onChanged();
    onClose();
  };

  const handleCell = async (holeNumber: number, playerId: string, raw: string, conceded: boolean) => {
    const gross = raw.trim() === '' ? null : parseInt(raw, 10);
    if (gross == null && !conceded) {
      const res = await clearMatchHoleScore(supabase, { matchId, holeNumber, playerId });
      if (!res.ok) setError(res.message);
    } else {
      const res = await upsertMatchHoleScore(supabase, { matchId, holeNumber, playerId, grossStrokes: gross, isConceded: conceded });
      if (!res.ok) setError(res.message);
    }
    load();
  };

  const entryFor = (hole: number, playerId: string) => entries.find((e) => e.holeNumber === hole && e.playerId === playerId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ className: 'ad-dlg' }}>
      <div className="ad-dlg-h">
        <div>
          <div className="ad-crumb">Scores</div>
          <h2 style={{ fontFamily: 'var(--pc-font-serif)', fontWeight: 500, fontSize: 24, margin: '4px 0 0' }}>
            Match #{matchNumber} scorecard
          </h2>
        </div>
        <button type="button" className="ad-ib" onClick={onClose} aria-label="Close">
          <AIcon name="x" size={18} />
        </button>
      </div>
      <DialogContent>
        {error && (
          <Alert severity="error" style={{ marginBottom: 14 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <p style={{ color: 'var(--pc-ink-3)' }}>Loading…</p>
        ) : !scorecard ? (
          <div className={styles.body}>
            <p style={{ color: 'var(--pc-ink-3)' }}>No scorecard has been started for this match yet.</p>
            <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleStart} disabled={busy}>
              Start scorecard
            </button>
          </div>
        ) : (
          <div className={styles.body}>
            {scorecard.disputed_at && (
              <div className={styles.disputeBanner}>
                <span>Flagged for committee review.</span>
                <button type="button" className="pc-d-actionbtn" onClick={handleResolveDispute} disabled={busy}>
                  Resolve dispute
                </button>
              </div>
            )}

            <div className={styles.row}>
              <span className="ad-badge">{scorecard.status}</span>
              {state && (
                <span style={{ fontSize: 12.5, color: 'var(--pc-ink-3)' }}>
                  Thru {state.thru} · {state.resultLabel || 'Not started'}
                </span>
              )}
              <span style={{ flex: 1 }} />
              {scorecard.status === 'final' ? (
                <button type="button" className="pc-d-actionbtn" onClick={() => handleSetStatus('in_progress')} disabled={busy}>
                  Reopen
                </button>
              ) : (
                <button type="button" className="pc-d-actionbtn" onClick={() => handleSetStatus('abandoned')} disabled={busy}>
                  Mark abandoned
                </button>
              )}
            </div>

            <div className={styles.row}>
              <span className={styles.label}>Format</span>
              <FormControl size="small" style={{ minWidth: 200 }}>
                <InputLabel>Format</InputLabel>
                <Select value={formatKey} label="Format" onChange={(e) => setFormatKey(e.target.value)}>
                  {listScoringFormats().map((f) => (
                    <MenuItem key={f.key} value={f.key}>
                      {f.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Allowance"
                type="number"
                size="small"
                inputProps={{ step: 0.05, min: 0, max: 2 }}
                value={allowance}
                onChange={(e) => setAllowance(e.target.value)}
                style={{ width: 110 }}
              />
              <button type="button" className="pc-d-actionbtn" onClick={handleSaveFormat} disabled={busy}>
                Save format
              </button>
            </div>

            <div className={styles.row}>
              <span className={styles.label}>Settle as of hole</span>
              <TextField
                type="number"
                size="small"
                inputProps={{ min: 1, max: holesCount }}
                value={settleHole}
                onChange={(e) => setSettleHole(e.target.value)}
                style={{ width: 90 }}
              />
              <button type="button" className="pc-d-actionbtn" onClick={handleSettle} disabled={busy || !settleHole}>
                Settle match
              </button>
            </div>

            <div>
              <div className={styles.label} style={{ marginBottom: 8 }}>
                Hole-by-hole (committee may edit any player&apos;s score)
              </div>
              <div className={styles.grid} style={{ '--pc-cols': players.length } as React.CSSProperties}>
                <div className={`${styles.gridRow} ${styles.gridHeadRow}`}>
                  <span className={styles.gridHeadCell}>Hole</span>
                  <span className={styles.gridHeadCell}>Par</span>
                  {players.map((p) => (
                    <span key={p.player_id} className={styles.gridHeadCell}>
                      {p.name}
                    </span>
                  ))}
                </div>
                {Array.from({ length: holesCount }, (_, i) => i + 1).map((hole) => {
                  const courseHole = courseHoles.find((h) => h.hole_number === hole);
                  return (
                    <div key={hole} className={styles.gridRow}>
                      <span style={{ fontFamily: 'var(--pc-font-mono)', fontWeight: 700 }}>{hole}</span>
                      <span style={{ fontFamily: 'var(--pc-font-mono)', color: 'var(--pc-ink-3)' }}>
                        {courseHole?.par ?? '–'}
                      </span>
                      {players.map((p) => {
                        const entry = entryFor(hole, p.player_id);
                        return (
                          <div key={p.player_id} className={styles.cell}>
                            <input
                              type="number"
                              defaultValue={entry?.grossStrokes ?? ''}
                              key={`${hole}-${p.player_id}-${entry?.grossStrokes}-${entry?.isConceded}`}
                              onBlur={(e) => handleCell(hole, p.player_id, e.target.value, entry?.isConceded ?? false)}
                            />
                            <label>
                              <input
                                type="checkbox"
                                defaultChecked={entry?.isConceded ?? false}
                                onChange={(e) => handleCell(hole, p.player_id, '', e.target.checked)}
                              />
                              PU
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
