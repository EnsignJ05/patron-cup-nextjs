'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { applyMatchBoardPersist } from '@/lib/applyMatchBoardPersist';
import { buildEventMatchesCsv, sanitizeFilenameSegment } from '@/lib/exportEventMatchesCsv';
import type { TeeTimeSlotSpec } from '@/lib/matchSetupBoard';
import { getFormatConfig } from '@/lib/matchFormatConfig';
import type { Match, Event, Course, Team, Player, MatchPlayer, TeamRoster } from '@/types/database';
import TeeTimeBoard from './TeeTimeBoard';

type MatchWithJoins = Match & { course?: Course; winner_team?: Team };
type MatchPlayerWithJoins = MatchPlayer & { player?: Player; match?: Pick<Match, 'id' | 'event_id' | 'match_date'> };
type TeamRosterWithJoins = TeamRoster & { player?: Player; team?: Team };

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-';
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const date = new Date(`1970-01-01T${normalized}`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

const formatHandicapDisplay = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const averageHandicaps = (values: (number | null | undefined)[]): number | null => {
  const nums = values.filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

export default function MatchSetupAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchWithJoins[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayerWithJoins[]>([]);
  const [teamRosters, setTeamRosters] = useState<TeamRosterWithJoins[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('year', { ascending: false });

      if (eventsError) {
        setError(eventsError.message);
        return;
      }

      const eventList = data || [];
      setEvents(eventList);

      const queryEventId = searchParams.get('eventId');
      const activeEvent = eventList.find((event) => event.is_active);
      setSelectedEventId(queryEventId || activeEvent?.id || eventList[0]?.id || '');
    };

    loadEvents();
  }, [supabase, searchParams]);

  const fetchEventData = useCallback(async (eventId: string) => {
    setLoading(true);
    setError('');

    const [matchesRes, teamsRes, playersRes, rosterRes, matchPlayersRes] = await Promise.all([
      supabase
        .from('matches')
        .select('*, course:courses(*), winner_team:teams!matches_winner_team_id_fkey(*)')
        .eq('event_id', eventId)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })
        .order('group_number', { ascending: true })
        .order('match_number', { ascending: true }),
      supabase.from('teams').select('*').eq('event_id', eventId).order('name'),
      supabase.from('players').select('*').eq('is_active', true).order('last_name'),
      supabase
        .from('team_rosters')
        .select('*, player:players(*), team:teams!inner(id,event_id,name)')
        .eq('team.event_id', eventId),
      supabase
        .from('match_players')
        .select('*, player:players(*), match:matches!inner(id,event_id,match_date)')
        .eq('match.event_id', eventId),
    ]);

    if (matchesRes.error) setError(matchesRes.error.message);
    if (teamsRes.error) setError(teamsRes.error.message);
    if (playersRes.error) setError(playersRes.error.message);
    if (rosterRes.error) setError(rosterRes.error.message);
    if (matchPlayersRes.error) setError(matchPlayersRes.error.message);

    setMatches(matchesRes.data || []);
    setTeams(teamsRes.data || []);
    setPlayers(playersRes.data || []);
    setTeamRosters(rosterRes.data || []);
    setMatchPlayers(matchPlayersRes.data || []);
    setLoading(false);
  }, [supabase]);

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

  /** Avoids invalid Tabs `value` (e.g. "") before the sync effect runs after data loads. */
  const resolvedCourseId = useMemo(() => {
    if (!matchCourses.length) return '';
    const ids = matchCourses.map((c) => c.id);
    if (selectedCourseId && ids.includes(selectedCourseId)) return selectedCourseId;
    return matchCourses[0].id;
  }, [matchCourses, selectedCourseId]);

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

  const matchById = useMemo(() => {
    const map = new Map<string, MatchWithJoins>();
    matches.forEach((match) => map.set(match.id, match));
    return map;
  }, [matches]);

  const matchPlayersByMatchId = useMemo(() => {
    const map = new Map<string, MatchPlayerWithJoins[]>();
    matchPlayers.forEach((mp) => {
      const list = map.get(mp.match_id) || [];
      list.push(mp);
      map.set(mp.match_id, list);
    });
    return map;
  }, [matchPlayers]);

  const assignedPlayersByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    matchPlayers.forEach((mp) => {
      const matchDate = mp.match?.match_date || matchById.get(mp.match_id)?.match_date;
      if (!matchDate) return;
      const set = map.get(matchDate) || new Set<string>();
      set.add(mp.player_id);
      map.set(matchDate, set);
    });
    return map;
  }, [matchPlayers, matchById]);

  const rosterPlayersByTeamId = useMemo(() => {
    const map = new Map<string, Player[]>();
    teamRosters.forEach((roster) => {
      if (!roster.player || !roster.team_id) return;
      const list = map.get(roster.team_id) || [];
      list.push(roster.player);
      map.set(roster.team_id, list);
    });
    return map;
  }, [teamRosters]);

  const handicapAtEventByTeamAndPlayer = useMemo(() => {
    const map = new Map<string, number | null>();
    teamRosters.forEach((r) => {
      if (!r.team_id || !r.player_id) return;
      map.set(`${r.team_id}|${r.player_id}`, r.handicap_at_event);
    });
    return map;
  }, [teamRosters]);

  const getHandicapAtEvent = useCallback(
    (teamId: string, playerId: string) => handicapAtEventByTeamAndPlayer.get(`${teamId}|${playerId}`) ?? null,
    [handicapAtEventByTeamAndPlayer],
  );

  const courseMatches = useMemo(() => {
    if (!resolvedCourseId) return [];
    return matches.filter((match) => (match.course?.id || 'tbd') === resolvedCourseId);
  }, [matches, resolvedCourseId]);

  const eventTeams = teams;

  const formatSlotLabel = useCallback((spec: TeeTimeSlotSpec) => {
    if (spec.match_time === null && spec.group_number === null) return 'TBD';
    const time = formatTime(spec.match_time);
    const g = spec.group_number !== null ? ` · Group ${spec.group_number}` : '';
    return `${time}${g}`;
  }, []);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const handleExportMatchesCsv = useCallback(() => {
    if (!selectedEventId) return;
    const csv = buildEventMatchesCsv(selectedEvent, matches, teams, matchPlayersByMatchId);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const base = selectedEvent
      ? `${sanitizeFilenameSegment(selectedEvent.name)}-${selectedEvent.year}`
      : 'matches';
    anchor.download = `${base}-matches.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [selectedEventId, selectedEvent, matches, teams, matchPlayersByMatchId]);

  const handleBoardPersist = useCallback(
    async (start: Record<string, string[]>, end: Record<string, string[]>) => {
      setError('');
      try {
        await applyMatchBoardPersist(supabase, courseMatches, start, end);
        setSuccess('Schedule updated.');
        await fetchEventData(selectedEventId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update schedule.';
        setError(message);
        throw err;
      }
    },
    [supabase, courseMatches, selectedEventId, fetchEventData],
  );

  const getAvailablePlayers = (match: MatchWithJoins, teamId: string) => {
    const rosterPlayers = rosterPlayersByTeamId.get(teamId);
    const basePlayers = rosterPlayers?.length ? rosterPlayers : players;
    const assignedOnDate = assignedPlayersByDate.get(match.match_date) || new Set<string>();
    const assignedInMatch = new Set((matchPlayersByMatchId.get(match.id) || []).map((mp) => mp.player_id));

    return basePlayers.filter(
      (player) => !assignedOnDate.has(player.id) && !assignedInMatch.has(player.id),
    );
  };

  const addMatchPlayer = async (match: MatchWithJoins, teamId: string, playerId: string) => {
    if (!playerId) return;
    const assignedOnDate = assignedPlayersByDate.get(match.match_date) || new Set<string>();
    if (assignedOnDate.has(playerId)) {
      setError('That player is already assigned to a match on this day.');
      return;
    }

    const { error: insertError } = await supabase
      .from('match_players')
      .insert([{ match_id: match.id, player_id: playerId, team_id: teamId, handicap_used: null }]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess('Player assigned to match.');
    fetchEventData(selectedEventId);
  };

  const removeMatchPlayer = async (matchPlayerId: string) => {
    const { error: deleteError } = await supabase.from('match_players').delete().eq('id', matchPlayerId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSuccess('Player removed from match.');
    fetchEventData(selectedEventId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text)' }}>
          Match Setup
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            disabled={!selectedEventId || loading}
            onClick={handleExportMatchesCsv}
            sx={{ borderColor: 'var(--text)', color: 'var(--text)' }}
          >
            Export matches (CSV)
          </Button>
          <Button variant="outlined" href="/admin/matches" sx={{ borderColor: 'var(--text)', color: 'var(--text)' }}>
            Back to Matches
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Event</InputLabel>
          <Select
            value={selectedEventId}
            label="Event"
            onChange={(event) => setSelectedEventId(event.target.value)}
          >
            {events.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {event.name} ({event.year})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {eventTeams.length !== 2 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Match setup expects exactly two teams for the selected event. Current team count: {eventTeams.length}.
        </Alert>
      )}

      {matchCourses.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography>No matches found for this event.</Typography>
        </Paper>
      ) : (
        <Paper>
          <Tabs
            value={resolvedCourseId}
            onChange={(_, value) => setSelectedCourseId(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              backgroundColor: 'var(--surface-muted)',
              px: 2,
              '& .MuiTabs-indicator': {
                height: 4,
                borderRadius: 2,
                backgroundColor: 'var(--text)',
                color: 'var(--bg)',
              },
            }}
          >
            {matchCourses.map((course) => (
              <Tab
                key={course.id}
                value={course.id}
                label={course.name}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  minHeight: 56,
                  px: 2.5,
                  mr: 1,
                    color: 'var(--tab-unselected-text)',
                  '&.Mui-selected': {
                    color: 'var(--text)',
                    backgroundColor: 'var(--surface-muted)',
                  },
                }}
              />
            ))}
          </Tabs>
          <Divider />
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Typography>Loading match setup...</Typography>
            ) : (
              <TeeTimeBoard<MatchWithJoins>
                courseKey={resolvedCourseId}
                matches={courseMatches}
                formatSlotLabel={formatSlotLabel}
                onPersist={handleBoardPersist}
                renderCard={(match) => {
                  const { playersPerTeam } = getFormatConfig(match.match_type);
                  const matchPlayersForMatch = matchPlayersByMatchId.get(match.id) || [];
                  const teamA = eventTeams[0];
                  const teamB = eventTeams[1];
                  const teamAPlayers = teamA
                    ? matchPlayersForMatch.filter((mp) => mp.team_id === teamA.id)
                    : [];
                  const teamBPlayers = teamB
                    ? matchPlayersForMatch.filter((mp) => mp.team_id === teamB.id)
                    : [];
                  return (
                    <Card variant="outlined" sx={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Match #{match.match_number}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                            {match.match_type}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                            Tee time: {formatTime(match.match_time)}
                          </Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                          {[teamA, teamB].map((team, teamIndex) => {
                            if (!team) return null;
                            const assignedPlayers = teamIndex === 0 ? teamAPlayers : teamBPlayers;
                            const availablePlayers = getAvailablePlayers(match, team.id);
                            const remainingSlots = Math.max(playersPerTeam - assignedPlayers.length, 0);

                            const teamAvg = averageHandicaps(
                              assignedPlayers.map((mp) => getHandicapAtEvent(team.id, mp.player_id)),
                            );

                            return (
                              <Box key={team.id}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25 }}>
                                  {team.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mb: 1 }}>
                                  Avg handicap: {formatHandicapDisplay(teamAvg)}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  {assignedPlayers.map((mp) => {
                                    const name =
                                      `${mp.player?.first_name || ''} ${mp.player?.last_name || ''}`.trim();
                                    const h = getHandicapAtEvent(team.id, mp.player_id);
                                    return (
                                      <Chip
                                        key={mp.id}
                                        label={`${name} (${formatHandicapDisplay(h)})`}
                                        onDelete={() => removeMatchPlayer(mp.id)}
                                        deleteIcon={<DeleteIcon />}
                                        variant="outlined"
                                        sx={{ color: 'var(--player-name-text)' }}
                                      />
                                    );
                                  })}
                                  {Array.from({ length: remainingSlots }).map((_, slotIndex) => (
                                    <FormControl key={`${match.id}-${team.id}-slot-${slotIndex}`} size="small">
                                      <InputLabel>Select player</InputLabel>
                                      <Select
                                        value=""
                                        label="Select player"
                                        disabled={!availablePlayers.length}
                                        onChange={(event) =>
                                          addMatchPlayer(match, team.id, event.target.value as string)
                                        }
                                      >
                                        {availablePlayers.map((player) => (
                                          <MenuItem key={player.id} value={player.id}>
                                            {player.first_name} {player.last_name} (
                                            {formatHandicapDisplay(getHandicapAtEvent(team.id, player.id))})
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  ))}
                                  {!availablePlayers.length && remainingSlots > 0 && (
                                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                                      No eligible players available
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                }}
              />
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
