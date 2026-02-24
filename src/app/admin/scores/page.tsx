'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Match, Event, Course, Team, Player, MatchPlayer } from '@/types/database';

type MatchWithJoins = Match & { course?: Course; winner_team?: Team };
type MatchPlayerWithJoins = MatchPlayer & {
  player?: Player;
  match?: Pick<Match, 'id' | 'event_id' | 'match_date'>;
};

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-';
  const date = new Date(`1970-01-01T${timeStr}:00`);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function ScoresAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [events, setEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchWithJoins[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayerWithJoins[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pendingResult, setPendingResult] = useState<{ match: MatchWithJoins; value: string } | null>(
    null,
  );

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
      const activeEvent = eventList.find((event) => event.is_active);
      setSelectedEventId(activeEvent?.id || eventList[0]?.id || '');
    };

    loadEvents();
  }, [supabase]);

  const fetchEventData = useCallback(
    async (eventId: string) => {
      setLoading(true);
      setError('');

      const [matchesRes, teamsRes, matchPlayersRes] = await Promise.all([
        supabase
          .from('matches')
          .select('*, course:courses(*), winner_team:teams!matches_winner_team_id_fkey(*)')
          .eq('event_id', eventId)
          .order('match_date', { ascending: true })
          .order('match_time', { ascending: true })
          .order('group_number', { ascending: true })
          .order('match_number', { ascending: true }),
        supabase.from('teams').select('*').eq('event_id', eventId).order('name'),
        supabase
          .from('match_players')
          .select('*, player:players(*), match:matches!inner(id,event_id,match_date)')
          .eq('match.event_id', eventId),
      ]);

      if (matchesRes.error) setError(matchesRes.error.message);
      if (teamsRes.error) setError(teamsRes.error.message);
      if (matchPlayersRes.error) setError(matchPlayersRes.error.message);

      setMatches(matchesRes.data || []);
      setTeams(teamsRes.data || []);
      setMatchPlayers(matchPlayersRes.data || []);
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

  const groupedMatches = useMemo(() => {
    const filtered = selectedCourseId
      ? matches.filter((match) => (match.course?.id || 'tbd') === selectedCourseId)
      : [];
    const groups = new Map<string, MatchWithJoins[]>();
    filtered.forEach((match) => {
      const key = [
        match.event_id,
        match.match_date,
        match.match_time || 'unscheduled',
        match.group_number ?? 'unscheduled',
      ].join('|');
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
    let update: Partial<Match> = { winner_team_id: null, is_halved: false };
    if (value === 'halved') {
      update = { winner_team_id: null, is_halved: true };
    } else if (value) {
      update = { winner_team_id: value, is_halved: false };
    }

    const { error: updateError } = await supabase.from('matches').update(update).eq('id', matchId);
    if (updateError) {
      setError(updateError.message);
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Match Scores
        </Typography>
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
          Match scoring expects exactly two teams for the selected event. Current team count: {eventTeams.length}.
        </Alert>
      )}

      {matchCourses.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography>No matches found for this event.</Typography>
        </Paper>
      ) : (
        <Paper>
          <Tabs
            value={selectedCourseId}
            onChange={(_, value) => setSelectedCourseId(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              backgroundColor: '#f5f7fa',
              px: 2,
              '& .MuiTabs-indicator': {
                height: 4,
                borderRadius: 2,
                backgroundColor: '#2c3e50',
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
                  '&.Mui-selected': {
                    color: '#1f2d3d',
                    backgroundColor: '#e1e8f0',
                  },
                }}
              />
            ))}
          </Tabs>
          <Divider />
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Typography>Loading match scores...</Typography>
            ) : (
              groupedMatches.map((group) => {
                const groupMatch = group.matches[0];
                const groupLabel =
                  groupMatch.match_time && groupMatch.group_number !== null
                    ? `${formatTime(groupMatch.match_time)} · Group ${groupMatch.group_number}`
                    : 'Unscheduled';

                return (
                  <Paper key={group.key} sx={{ p: 3, mb: 3 }} variant="outlined">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {groupLabel}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {groupMatch.course?.name || 'Course TBD'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                      {group.matches.map((match) => {
                        const matchPlayersForMatch = matchPlayersByMatchId.get(match.id) || [];
                        const teamA = eventTeams[0];
                        const teamB = eventTeams[1];
                        const teamAPlayers = teamA
                          ? matchPlayersForMatch.filter((mp) => mp.team_id === teamA.id)
                          : [];
                        const teamBPlayers = teamB
                          ? matchPlayersForMatch.filter((mp) => mp.team_id === teamB.id)
                          : [];
                        const winnerValue = match.is_halved ? 'halved' : match.winner_team_id || '';
                        const winnerLabel = match.is_halved
                          ? 'Halved'
                          : match.winner_team_id
                            ? `Winner: ${getTeamName(match.winner_team_id)}`
                            : 'Pending';

                        return (
                          <Card key={match.id} variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    Match #{match.match_number}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#666' }}>
                                    {match.match_type}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={winnerLabel}
                                  size="small"
                                  color={match.is_halved ? 'info' : match.winner_team_id ? 'success' : 'default'}
                                />
                              </Box>

                              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                {[teamA, teamB].map((team, teamIndex) => {
                                  if (!team) return null;
                                  const assignedPlayers = teamIndex === 0 ? teamAPlayers : teamBPlayers;

                                  return (
                                    <Box key={team.id}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                        {team.name}
                                      </Typography>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {assignedPlayers.length ? (
                                          assignedPlayers.map((mp) => (
                                            <Chip
                                              key={mp.id}
                                              label={`${mp.player?.first_name || ''} ${mp.player?.last_name || ''}`.trim()}
                                              variant="outlined"
                                              size="small"
                                            />
                                          ))
                                        ) : (
                                          <Typography variant="caption" sx={{ color: '#777' }}>
                                            No players assigned
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>

                              <Divider sx={{ my: 2 }} />

                              <Box
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                                  gap: 1.5,
                                }}
                              >
                                <Button
                                  fullWidth
                                  size="large"
                                  variant={winnerValue === teamA?.id ? 'contained' : 'outlined'}
                                  onClick={() => teamA && openConfirm(match, teamA.id)}
                                  sx={{ py: 1.5 }}
                                  disabled={!teamA}
                                >
                                  {teamA?.name || 'Team A'}
                                </Button>
                                <Button
                                  fullWidth
                                  size="large"
                                  color="info"
                                  variant={winnerValue === 'halved' ? 'contained' : 'outlined'}
                                  onClick={() => openConfirm(match, 'halved')}
                                  sx={{ py: 1.5 }}
                                >
                                  Halved
                                </Button>
                                <Button
                                  fullWidth
                                  size="large"
                                  color="secondary"
                                  variant={winnerValue === teamB?.id ? 'contained' : 'outlined'}
                                  onClick={() => teamB && openConfirm(match, teamB.id)}
                                  sx={{ py: 1.5 }}
                                  disabled={!teamB}
                                >
                                  {teamB?.name || 'Team B'}
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </Paper>
                );
              })
            )}
          </Box>
        </Paper>
      )}

      <Dialog open={Boolean(pendingResult)} onClose={() => setPendingResult(null)}>
        <DialogTitle>Confirm Result</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            Set result for match #{pendingResult?.match.match_number} to <strong>{confirmLabel}</strong>?
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            This will clear any previously selected winner or halved status.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingResult(null)} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="contained" disabled={confirming}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
