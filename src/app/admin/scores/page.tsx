'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { setOfficialMatchResult } from '@/lib/matchResultMutations';
import { fetchEventMatchScorecards, type MatchScorecardLite } from '@/lib/repositories/matchScorecards';
import ScorecardEditorDialog from '@/components/admin/ScorecardEditorDialog';
import type { Match, Event, Course, Team, Player, MatchPlayer } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

type MatchWithJoins = Match & { course?: Course; winner_team?: Team };
type MatchPlayerWithJoins = MatchPlayer & {
  player?: Player;
  match?: Pick<Match, 'id' | 'event_id' | 'match_date'>;
};

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '—';
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const date = new Date(`1970-01-01T${normalized}`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function ScoresAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [events, setEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchWithJoins[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayerWithJoins[]>([]);
  const [scorecards, setScorecards] = useState<MatchScorecardLite[]>([]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pendingResult, setPendingResult] = useState<{ match: MatchWithJoins; value: string } | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error: eventsError } = await supabase.from('events').select('*').order('year', { ascending: false });

      if (eventsError) {
        setError(eventsError.message);
        return;
      }

      const eventList = data || [];
      setEvents(eventList);
      const activeEvent = eventList.find((event) => event.is_active);
      setSelectedEventId(activeEvent?.id || eventList[0]?.id || '');
    };

    loadEvents();
  }, [supabase]);

  const fetchEventData = useCallback(
    async (eventId: string) => {
      setLoading(true);
      setError('');

      const [matchesRes, teamsRes, matchPlayersRes, scorecardsRes] = await Promise.all([
        supabase
          .from('matches')
          .select('*, course:courses(*), winner_team:teams!matches_winner_team_id_fkey(*)')
          .eq('event_id', eventId)
          .order('match_date', { ascending: true })
          .order('match_time', { ascending: true })
          .order('group_number', { ascending: true })
          .order('match_number', { ascending: true }),
        supabase.from('teams').select('*').eq('event_id', eventId).order('name'),
        supabase.from('match_players').select('*, player:players(*), match:matches!inner(id,event_id,match_date)').eq('match.event_id', eventId),
        fetchEventMatchScorecards(supabase, eventId),
      ]);

      if (matchesRes.error) setError(matchesRes.error.message);
      if (teamsRes.error) setError(teamsRes.error.message);
      if (matchPlayersRes.error) setError(matchPlayersRes.error.message);

      setMatches(matchesRes.data || []);
      setTeams(teamsRes.data || []);
      setMatchPlayers(matchPlayersRes.data || []);
      setScorecards(scorecardsRes.data || []);
      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    if (!selectedEventId) return;
    fetchEventData(selectedEventId);
  }, [selectedEventId, fetchEventData]);

  const matchCourses = useMemo(() => {
    const map = new Map<string, { name: string; firstDate: string }>();
    matches.forEach((match) => {
      const courseId = match.course?.id || 'tbd';
      const courseName = match.course?.name || 'Course TBD';
      const existing = map.get(courseId);
      if (!existing || match.match_date < existing.firstDate) {
        map.set(courseId, { name: courseName, firstDate: match.match_date });
      }
    });
    return Array.from(map.entries())
      .map(([id, value]) => ({ id, name: value.name, firstDate: value.firstDate }))
      .sort((a, b) => a.firstDate.localeCompare(b.firstDate));
  }, [matches]);

  useEffect(() => {
    if (!matchCourses.length) {
      setSelectedCourseId('');
      return;
    }
    const courseIds = matchCourses.map((course) => course.id);
    if (!selectedCourseId || !courseIds.includes(selectedCourseId)) {
      setSelectedCourseId(matchCourses[0].id);
    }
  }, [matchCourses, selectedCourseId]);

  const matchPlayersByMatchId = useMemo(() => {
    const map = new Map<string, MatchPlayerWithJoins[]>();
    matchPlayers.forEach((mp) => {
      const list = map.get(mp.match_id) || [];
      list.push(mp);
      map.set(mp.match_id, list);
    });
    return map;
  }, [matchPlayers]);

  const scorecardByMatchId = useMemo(
    () => new Map(scorecards.map((s) => [s.match_id, s])),
    [scorecards],
  );

  const disputedScorecards = useMemo(() => scorecards.filter((s) => s.disputed_at), [scorecards]);

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  const editingMatch = editingMatchId ? matchById.get(editingMatchId) ?? null : null;
  const editingPlayers = useMemo(() => {
    if (!editingMatchId) return [];
    return (matchPlayersByMatchId.get(editingMatchId) || []).map((mp) => ({
      player_id: mp.player_id,
      team_id: mp.team_id,
      name: `${mp.player?.first_name || ''} ${mp.player?.last_name || ''}`.trim(),
      strokes_received: mp.strokes_received,
    }));
  }, [editingMatchId, matchPlayersByMatchId]);

  const groupedMatches = useMemo(() => {
    const filtered = selectedCourseId ? matches.filter((match) => (match.course?.id || 'tbd') === selectedCourseId) : [];
    const groups = new Map<string, MatchWithJoins[]>();
    filtered.forEach((match) => {
      const key = [match.event_id, match.match_date, match.match_time || 'unscheduled', match.group_number ?? 'unscheduled'].join('|');
      const list = groups.get(key) || [];
      list.push(match);
      groups.set(key, list);
    });

    return Array.from(groups.entries())
      .map(([key, groupMatches]) => ({ key, matches: groupMatches }))
      .sort((a, b) => {
        const aMatch = a.matches[0];
        const bMatch = b.matches[0];
        const aTime = aMatch.match_time || '99:99';
        const bTime = bMatch.match_time || '99:99';
        if (aTime !== bTime) return aTime.localeCompare(bTime);
        const aGroup = aMatch.group_number ?? 999;
        const bGroup = bMatch.group_number ?? 999;
        return aGroup - bGroup;
      });
  }, [matches, selectedCourseId]);

  const eventTeams = teams;

  const getTeamName = useCallback(
    (teamId: string | null) => {
      if (!teamId) return '';
      return eventTeams.find((team) => team.id === teamId)?.name || 'Team';
    },
    [eventTeams],
  );

  const openConfirm = (match: MatchWithJoins, value: string) => {
    setPendingResult({ match, value });
  };

  const updateMatchResult = async (matchId: string, value: string) => {
    const result = await setOfficialMatchResult(supabase, { matchId, value });
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setSuccess('Match result updated.');
    fetchEventData(selectedEventId);
    return true;
  };

  const confirmLabel = useMemo(() => {
    if (!pendingResult) return '';
    if (pendingResult.value === 'halved') return 'Halved';
    return getTeamName(pendingResult.value);
  }, [pendingResult, getTeamName]);

  const handleConfirm = async () => {
    if (!pendingResult) return;
    setConfirming(true);
    const didUpdate = await updateMatchResult(pendingResult.match.id, pendingResult.value);
    setConfirming(false);
    if (didUpdate) {
      setPendingResult(null);
    }
  };

  return (
    <div>
      <AdminHead
        crumb="Scores"
        title="Scores"
        sub="Review and set official match results."
        actions={
          <FormControl size="small" className={styles.eventFilter}>
            <InputLabel>Event</InputLabel>
            <Select value={selectedEventId} label="Event" onChange={(event) => setSelectedEventId(event.target.value)}>
              {events.map((event) => (
                <MenuItem key={event.id} value={event.id}>
                  {event.name} ({event.year})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      />

      {error && (
        <Alert severity="error" className={styles.alert} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" className={styles.alert} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {eventTeams.length !== 2 && (
        <Alert severity="warning" className={styles.alert}>
          Match scoring expects exactly two teams for the selected event. Current team count: {eventTeams.length}.
        </Alert>
      )}

      {disputedScorecards.length > 0 && (
        <div className="ad-card" style={{ padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pc-team-a)' }}>
            Disputed scorecards ({disputedScorecards.length})
          </div>
          {disputedScorecards.map((s) => {
            const match = matchById.get(s.match_id);
            return (
              <div key={s.match_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13 }}>Match #{match?.match_number ?? '?'}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--pc-ink-3)' }}>{match?.match_type}</span>
                <button type="button" className="pc-d-actionbtn" onClick={() => setEditingMatchId(s.match_id)}>
                  Review
                </button>
              </div>
            );
          })}
        </div>
      )}

      {matchCourses.length === 0 ? (
        <p className={styles.emptyState}>No matches found for this event.</p>
      ) : (
        <>
          <div className={styles.courseTabs}>
            {matchCourses.map((course) => (
              <button
                key={course.id}
                type="button"
                className="ad-chip"
                data-on={selectedCourseId === course.id}
                onClick={() => setSelectedCourseId(course.id)}
              >
                {course.name}
              </button>
            ))}
          </div>

          {loading ? (
            <p className={styles.emptyState}>Loading match scores...</p>
          ) : (
            groupedMatches.map((group) => {
              const groupMatch = group.matches[0];
              const groupLabel =
                groupMatch.match_time && groupMatch.group_number !== null
                  ? `${formatTime(groupMatch.match_time)} · Group ${groupMatch.group_number}`
                  : 'Unscheduled';

              return (
                <div key={group.key} className={styles.group}>
                  <h2 className={styles.groupHeading}>{groupLabel}</h2>
                  <p className="ad-sub" style={{ margin: '2px 0 12px' }}>
                    {groupMatch.course?.name || 'Course TBD'}
                  </p>

                  <div className={styles.matchGrid}>
                    {group.matches.map((match) => {
                      const matchPlayersForMatch = matchPlayersByMatchId.get(match.id) || [];
                      const teamA = eventTeams[0];
                      const teamB = eventTeams[1];
                      const teamAPlayers = teamA ? matchPlayersForMatch.filter((mp) => mp.team_id === teamA.id) : [];
                      const teamBPlayers = teamB ? matchPlayersForMatch.filter((mp) => mp.team_id === teamB.id) : [];
                      const winnerValue = match.is_halved ? 'halved' : match.winner_team_id || '';
                      const isOfficial = match.result_set_by_official === true;
                      const winnerLabel = match.is_halved ? 'Halved' : match.winner_team_id ? `Winner: ${getTeamName(match.winner_team_id)}` : 'Pending';
                      const scorecard = scorecardByMatchId.get(match.id);

                      return (
                        <div key={match.id} className="ad-card" style={{ padding: 16, display: 'grid', gap: 14 }}>
                          <div className={styles.matchHeader}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>Match #{match.match_number}</div>
                              <div style={{ fontSize: 12, color: 'var(--pc-ink-3)' }}>{match.match_type}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <span
                                className={
                                  match.is_halved ? styles.statusHalved : match.winner_team_id ? styles.statusFinal : styles.statusPending
                                }
                              >
                                {winnerLabel}
                              </span>
                              {isOfficial && <span className="ad-badge">Official</span>}
                              {scorecard && <span className="ad-badge">Scorecard: {scorecard.status}</span>}
                              {scorecard?.disputed_at && <span className="ad-badge" style={{ color: 'var(--pc-team-a)' }}>Disputed</span>}
                            </div>
                          </div>

                          <div className={styles.teamsGrid}>
                            {[teamA, teamB].map((team, teamIndex) => {
                              if (!team) return null;
                              const assignedPlayers = teamIndex === 0 ? teamAPlayers : teamBPlayers;

                              return (
                                <div key={team.id}>
                                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{team.name}</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {assignedPlayers.length ? (
                                      assignedPlayers.map((mp) => (
                                        <span key={mp.id} className="ad-badge">
                                          {`${mp.player?.first_name || ''} ${mp.player?.last_name || ''}`.trim()}
                                        </span>
                                      ))
                                    ) : (
                                      <span style={{ fontSize: 11, color: 'var(--pc-ink-3)' }}>No players assigned</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className={styles.resultRow}>
                            <button
                              type="button"
                              className="pc-d-actionbtn"
                              data-primary={winnerValue === teamA?.id || undefined}
                              disabled={!teamA}
                              onClick={() => teamA && openConfirm(match, teamA.id)}
                            >
                              {teamA?.name || 'Team A'}
                            </button>
                            <button
                              type="button"
                              className="pc-d-actionbtn"
                              data-primary={winnerValue === 'halved' || undefined}
                              onClick={() => openConfirm(match, 'halved')}
                            >
                              Halved
                            </button>
                            <button
                              type="button"
                              className="pc-d-actionbtn"
                              data-primary={winnerValue === teamB?.id || undefined}
                              disabled={!teamB}
                              onClick={() => teamB && openConfirm(match, teamB.id)}
                            >
                              {teamB?.name || 'Team B'}
                            </button>
                            <span style={{ flex: 1 }} />
                            <button type="button" className="pc-d-actionbtn" onClick={() => setEditingMatchId(match.id)}>
                              <AIcon name="setup" size={14} />
                              <span>Scorecard</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      <Dialog open={Boolean(pendingResult)} onClose={() => setPendingResult(null)} PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <h2 className={styles.dialogTitle}>Confirm result</h2>
        </div>
        <DialogContent>
          <p style={{ margin: '0 0 8px', color: 'var(--pc-ink)' }}>
            Set result for match #{pendingResult?.match.match_number} to <strong>{confirmLabel}</strong>?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--pc-ink-3)' }}>This will clear any previously selected winner or halved status.</p>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" disabled={confirming} onClick={() => setPendingResult(null)}>
            Cancel
          </button>
          <button type="button" className="pc-d-actionbtn" data-primary="true" disabled={confirming} onClick={handleConfirm}>
            <AIcon name="check" size={14} />
            <span>Confirm</span>
          </button>
        </div>
      </Dialog>

      {editingMatch && (
        <ScorecardEditorDialog
          open={Boolean(editingMatchId)}
          onClose={() => setEditingMatchId(null)}
          matchId={editingMatch.id}
          matchNumber={editingMatch.match_number}
          courseId={editingMatch.course_id}
          players={editingPlayers}
          onChanged={() => fetchEventData(selectedEventId)}
        />
      )}
    </div>
  );
}
