'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Match, Event, Course, Team, Player, MatchPlayer, TeamRoster } from '@/types/database';
import { getTeamTotals } from '@/lib/matchScoring';
import { calculateMatchHandicapMetrics } from '@/lib/matchHandicapMetrics';
import { useAuth } from '@/context/AuthContext';
import { isAdminRole } from '@/lib/authConfig';
import {
  buildEventMatchHandicapStrokesCsv,
  type EventMatchHandicapStrokesCsvRow,
} from '@/lib/exportEventMatchHandicapStrokesCsv';
import { sanitizeFilenameSegment } from '@/lib/exportEventMatchesCsv';
import OverallScoreBanner from '@/components/matches/OverallScoreBanner';
import MatchCard from '@/components/matches/MatchCard';
import styles from './page.module.css';

type MatchWithJoins = Match & { course?: Course; winner_team?: Team };
type MatchPlayerWithJoins = MatchPlayer & {
  player?: Pick<Player, 'id' | 'first_name' | 'last_name' | 'profile_image_url'>;
  team?: Pick<Team, 'id' | 'name' | 'color'>;
  match?: Pick<Match, 'id' | 'event_id' | 'match_date'>;
};
type TeamRosterLite = Pick<TeamRoster, 'player_id' | 'team_id' | 'handicap_at_event'>;

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return 'TBD';
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const date = new Date(`1970-01-01T${normalized}`);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

const getDefaultTeamColor = (index: number) =>
  index === 0 ? 'var(--accent-blue)' : 'var(--accent-red)';

export default function MatchesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { role } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchWithJoins[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayerWithJoins[]>([]);
  const [teamRosters, setTeamRosters] = useState<TeamRosterLite[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      try {
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
            .select(
              '*, player:players(id, first_name, last_name, profile_image_url), team:teams(id, name, color), match:matches!inner(id,event_id,match_date)'
            )
            .eq('match.event_id', eventId),
        ]);

        if (matchesRes.error) setError(matchesRes.error.message);
        if (teamsRes.error) setError(teamsRes.error.message);
        if (matchPlayersRes.error) setError(matchPlayersRes.error.message);

        const matchesData = matchesRes.data || [];
        const teamsData = teamsRes.data || [];
        const matchPlayersData = matchPlayersRes.data || [];

        setMatches(matchesData);
        setTeams(teamsData);
        setMatchPlayers(matchPlayersData);

        const teamIds = teamsData.map((team) => team.id);
        if (teamIds.length) {
          const { data: rostersData, error: rostersError } = await supabase
            .from('team_rosters')
            .select('player_id, team_id, handicap_at_event')
            .in('team_id', teamIds);

          if (rostersError) {
            setError(rostersError.message);
          }
          setTeamRosters(rostersData || []);
        } else {
          setTeamRosters([]);
        }
      } finally {
        setLoading(false);
      }
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

  const matchPlayersByMatchId = useMemo(() => {
    const map = new Map<string, MatchPlayerWithJoins[]>();
    matchPlayers.forEach((mp) => {
      const list = map.get(mp.match_id) || [];
      list.push(mp);
      map.set(mp.match_id, list);
    });
    return map;
  }, [matchPlayers]);

  const handicapByPlayerId = useMemo(() => {
    return new Map(teamRosters.map((roster) => [roster.player_id, roster.handicap_at_event]));
  }, [teamRosters]);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const currentEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const canExportMatches = isAdminRole(role);

  const groupedMatches = useMemo(() => {
    const filtered = resolvedCourseId
      ? matches.filter((match) => (match.course?.id || 'tbd') === resolvedCourseId)
      : [];
    const groups = new Map<string, MatchWithJoins[]>();
    filtered.forEach((match) => {
      const key = [
        match.event_id,
        match.match_date,
        match.match_time || 'tbd',
        match.group_number ?? 'tbd',
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
  }, [matches, resolvedCourseId]);

  const eventTeams = teams.map((team, index) => ({
    ...team,
    color: team.color || getDefaultTeamColor(index),
  }));

  const teamTotals = useMemo(() => {
    if (!eventTeams.length) return {};
    return getTeamTotals(matches, eventTeams.map((team) => team.id));
  }, [matches, eventTeams]);

  const handleExportMatchHandicaps = useCallback(() => {
    if (!canExportMatches) return;

    const rows: EventMatchHandicapStrokesCsvRow[] = [];

    for (const match of matches) {
      const playersForMatch = matchPlayersByMatchId.get(match.id) || [];
      if (!playersForMatch.length) continue;

      const playersForMetrics = playersForMatch
        .map((mp) => {
          const player = mp.player;
          if (!player) return null;
          return {
            playerId: player.id,
            officialEventHandicap: handicapByPlayerId.get(player.id) ?? null,
          };
        })
        .filter((player): player is NonNullable<typeof player> => Boolean(player));

      const handicapMetricsByPlayerId = calculateMatchHandicapMetrics(playersForMetrics, {
        slope: match.course?.slope ?? null,
        rating: match.course?.rating ?? null,
        par: match.course?.par ?? null,
      });

      const sortedRows = playersForMatch
        .map((mp) => {
          const player = mp.player;
          if (!player) return null;
          const officialEventHandicap = handicapByPlayerId.get(player.id) ?? null;
          const handicapMetrics = handicapMetricsByPlayerId.get(player.id);
          const teamName = teamById.get(mp.team_id)?.name ?? '';
          return {
            courseName: match.course?.name ?? 'Course TBD',
            matchDate: match.match_date,
            matchTime: match.match_time ?? null,
            groupNumber: match.group_number ?? null,
            matchNumber: match.match_number,
            matchType: match.match_type,
            teamName,
            playerName: `${player.first_name} ${player.last_name}`.trim(),
            officialEventHandicap,
            courseHandicap: handicapMetrics?.courseHandicap ?? null,
            strokesGiven: handicapMetrics?.strokesGiven ?? null,
          };
        })
        .filter((row): row is EventMatchHandicapStrokesCsvRow => Boolean(row))
        .sort((a, b) => {
          const teamSort = a.teamName.localeCompare(b.teamName);
          if (teamSort !== 0) return teamSort;
          return a.playerName.localeCompare(b.playerName);
        });

      rows.push(...sortedRows);
    }

    const csv = buildEventMatchHandicapStrokesCsv(
      currentEvent ? { name: currentEvent.name, year: currentEvent.year } : null,
      rows,
    );
    const filename = `${sanitizeFilenameSegment(currentEvent?.name ?? 'event')}-${currentEvent?.year ?? 'matches'}-matches-handicaps.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [canExportMatches, currentEvent, handicapByPlayerId, matchPlayersByMatchId, matches, teamById]);

  return (
    <Box className={styles.pageRoot}>
      <OverallScoreBanner teams={eventTeams} totals={teamTotals} />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box className={styles.controlsRow}>
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
        {canExportMatches && (
          <Button
            variant="outlined"
            onClick={handleExportMatchHandicaps}
            disabled={loading || matches.length === 0}
            className={styles.exportButton}
          >
            Export Match Handicaps
          </Button>
        )}
      </Box>

      {eventTeams.length !== 2 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Matches are designed for exactly two teams. Current team count: {eventTeams.length}.
        </Alert>
      )}

      {matchCourses.length === 0 ? (
        <Paper className={styles.emptyState}>
          <Typography>No matches found for this event.</Typography>
        </Paper>
      ) : (
        <Paper className={styles.matchesCard}>
          <Tabs
            value={resolvedCourseId}
            onChange={(_, value) => setSelectedCourseId(value)}
            variant="scrollable"
            scrollButtons="auto"
            className={styles.tabs}
            sx={{
              '& .MuiTabs-indicator': {
                height: 4,
                borderRadius: 4,
                backgroundColor: 'var(--text)',
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
                    backgroundColor: 'var(--surface)',
                  },
                }}
              />
            ))}
          </Tabs>
          <Divider />
          <Box className={styles.matchesBody}>
            {loading ? (
              <Typography>Loading matches...</Typography>
            ) : (
              groupedMatches.map((group) => {
                const groupMatch = group.matches[0];
                const courseLabel = groupMatch.course?.name || 'Course TBD';

                return (
                  <Paper key={group.key} className={styles.groupCard} variant="outlined">
                    <Box className={styles.groupHeader}>
                      <Box>
                        <Typography variant="h6" className={styles.groupTitle}>
                          {courseLabel}
                        </Typography>
                      </Box>
                    </Box>
                    <Box className={styles.groupMatches}>
                      {group.matches.map((match) => {
                        const matchPlayersForMatch = matchPlayersByMatchId.get(match.id) || [];
                        const [teamA, teamB] = eventTeams;
                        const teamAPlayers = teamA
                          ? matchPlayersForMatch.filter((mp) => mp.team_id === teamA.id)
                          : [];
                        const teamBPlayers = teamB
                          ? matchPlayersForMatch.filter((mp) => mp.team_id === teamB.id)
                          : [];

                        const buildPlayers = (players: MatchPlayerWithJoins[]) =>
                          players
                            .map((mp) => {
                              const player = mp.player;
                              if (!player) return null;
                              const officialEventHandicap = handicapByPlayerId.get(player.id) ?? null;
                              return {
                                id: player.id,
                                name: `${player.first_name} ${player.last_name}`.trim(),
                                officialEventHandicap,
                                profileImageUrl: player.profile_image_url || null,
                              };
                            })
                            .filter((player): player is NonNullable<typeof player> => Boolean(player))
                            .sort((a, b) => a.name.localeCompare(b.name));

                        const teamAPlayerCards = buildPlayers(teamAPlayers);
                        const teamBPlayerCards = buildPlayers(teamBPlayers);
                        const matchPlayerCards = [...teamAPlayerCards, ...teamBPlayerCards];
                        const handicapMetricsByPlayerId = calculateMatchHandicapMetrics(
                          matchPlayerCards.map((player) => ({
                            playerId: player.id,
                            officialEventHandicap: player.officialEventHandicap,
                          })),
                          {
                            slope: match.course?.slope ?? null,
                            rating: match.course?.rating ?? null,
                            par: match.course?.par ?? null,
                          },
                        );

                        const withMetrics = <T extends { id: string; officialEventHandicap: number | null }>(player: T) => {
                          const metrics = handicapMetricsByPlayerId.get(player.id);
                          return {
                            ...player,
                            courseHandicap: metrics?.courseHandicap ?? null,
                            strokesGiven: metrics?.strokesGiven ?? null,
                          };
                        };

                        return (
                          <MatchCard
                            key={match.id}
                            matchNumber={match.match_number}
                            matchType={match.match_type}
                            teeTime={formatTime(match.match_time)}
                              showCardOutline={false}
                            teamA={
                              teamA
                                ? {
                                    id: teamA.id,
                                    name: teamA.name,
                                    color: teamA.color,
                                    players: teamAPlayerCards.map(withMetrics),
                                  }
                                : null
                            }
                            teamB={
                              teamB
                                ? {
                                    id: teamB.id,
                                    name: teamB.name,
                                    color: teamB.color,
                                    players: teamBPlayerCards.map(withMetrics),
                                  }
                                : null
                            }
                            winnerTeamId={match.winner_team_id}
                            isHalved={match.is_halved}
                          />
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
