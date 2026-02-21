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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Match, Event, Course, Team, Player, MatchPlayer, TeamRoster } from '@/types/database';

type MatchWithJoins = Match & { course?: Course; winner_team?: Team };
type MatchPlayerWithJoins = MatchPlayer & { player?: Player; match?: Pick<Match, 'id' | 'event_id' | 'match_date'> };
type TeamRosterWithJoins = TeamRoster & { player?: Player; team?: Team };

const normalizeMatchType = (matchType: string) =>
  matchType.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const getFormatConfig = (matchType: string) => {
  const normalized = normalizeMatchType(matchType);
  if (normalized.includes('two man better ball') || normalized.includes('betterball')) {
    return { playersPerTeam: 2, matchesPerGroup: 1, isUnknown: false };
  }
  if (normalized.includes('h2h') || normalized.includes('singles')) {
    return { playersPerTeam: 1, matchesPerGroup: 2, isUnknown: false };
  }
  return { playersPerTeam: 2, matchesPerGroup: 1, isUnknown: true };
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
};

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-';
  const date = new Date(`1970-01-01T${timeStr}:00`);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
  const [selectedDate, setSelectedDate] = useState('');
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

  const matchDates = useMemo(() => {
    const dates = Array.from(new Set(matches.map((match) => match.match_date))).sort();
    return dates;
  }, [matches]);

  useEffect(() => {
    if (!matchDates.length) {
      setSelectedDate('');
      return;
    }
    if (!selectedDate || !matchDates.includes(selectedDate)) {
      setSelectedDate(matchDates[0]);
    }
  }, [matchDates, selectedDate]);

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

  const groupedMatches = useMemo(() => {
    const filtered = selectedDate ? matches.filter((match) => match.match_date === selectedDate) : [];
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
  }, [matches, selectedDate]);

  const eventTeams = teams;

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
      return;
    }
    setSuccess('Match result updated.');
    fetchEventData(selectedEventId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Match Setup
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" href="/admin/matches" sx={{ borderColor: '#2c3e50', color: '#2c3e50' }}>
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

      {matchDates.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography>No matches found for this event.</Typography>
        </Paper>
      ) : (
        <Paper>
          <Tabs
            value={selectedDate}
            onChange={(_, value) => setSelectedDate(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {matchDates.map((date) => (
              <Tab key={date} value={date} label={formatDate(date)} />
            ))}
          </Tabs>
          <Divider />
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Typography>Loading match setup...</Typography>
            ) : (
              groupedMatches.map((group) => {
                const groupMatch = group.matches[0];
                const groupLabel =
                  groupMatch.match_time && groupMatch.group_number !== null
                    ? `${formatTime(groupMatch.match_time)} · Group ${groupMatch.group_number}`
                    : 'Unscheduled';
                const formatConfig = getFormatConfig(groupMatch.match_type);
                const expectedMatches = formatConfig.matchesPerGroup;
                const groupMismatch = group.matches.length !== expectedMatches;

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
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {formatConfig.isUnknown && (
                          <Chip icon={<WarningAmberIcon />} label="Unknown format" color="warning" size="small" />
                        )}
                        {groupMismatch && (
                          <Chip
                            label={`Expected ${expectedMatches} match${expectedMatches > 1 ? 'es' : ''}`}
                            color="warning"
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      {group.matches.map((match) => {
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
                        const winnerValue = match.is_halved ? 'halved' : match.winner_team_id || '';
                        const winnerDisabled = !teamAPlayers.length || !teamBPlayers.length;

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
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  {match.is_halved ? (
                                    <Chip label="Halved (0.5 each)" size="small" color="info" />
                                  ) : match.winner_team_id ? (
                                    <Chip label="Winner +1" size="small" color="success" />
                                  ) : (
                                    <Chip label="Pending" size="small" />
                                  )}
                                </Box>
                              </Box>

                              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <InputLabel>Winner</InputLabel>
                                <Select
                                  value={winnerValue}
                                  label="Winner"
                                  disabled={winnerDisabled}
                                  onChange={(event) => updateMatchResult(match.id, event.target.value)}
                                >
                                  <MenuItem value="">Pending</MenuItem>
                                  <MenuItem value="halved">Halved (Tie)</MenuItem>
                                  {teamA && <MenuItem value={teamA.id}>{teamA.name}</MenuItem>}
                                  {teamB && <MenuItem value={teamB.id}>{teamB.name}</MenuItem>}
                                </Select>
                              </FormControl>

                              <Divider sx={{ mb: 2 }} />

                              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                {[teamA, teamB].map((team, teamIndex) => {
                                  if (!team) return null;
                                  const assignedPlayers = teamIndex === 0 ? teamAPlayers : teamBPlayers;
                                  const availablePlayers = getAvailablePlayers(match, team.id);
                                  const remainingSlots = Math.max(playersPerTeam - assignedPlayers.length, 0);

                                  return (
                                    <Box key={team.id}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                        {team.name}
                                      </Typography>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {assignedPlayers.map((mp) => (
                                          <Chip
                                            key={mp.id}
                                            label={`${mp.player?.first_name || ''} ${mp.player?.last_name || ''}`.trim()}
                                            onDelete={() => removeMatchPlayer(mp.id)}
                                            deleteIcon={<DeleteIcon />}
                                            variant="outlined"
                                          />
                                        ))}
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
                                                  {player.first_name} {player.last_name}
                                                </MenuItem>
                                              ))}
                                            </Select>
                                          </FormControl>
                                        ))}
                                        {!availablePlayers.length && remainingSlots > 0 && (
                                          <Typography variant="caption" sx={{ color: '#777' }}>
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
                      })}
                    </Box>
                  </Paper>
                );
              })
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
