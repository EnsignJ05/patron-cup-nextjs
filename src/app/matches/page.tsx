'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Image from 'next/image';
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
import styles from './page.module.css';

type MatchWithJoins = Match & { course?: Course; winner_team?: Team };
type MatchPlayerWithJoins = MatchPlayer & {
  player?: Pick<Player, 'id' | 'first_name' | 'last_name' | 'profile_image_url'>;
  team?: Pick<Team, 'id' | 'name' | 'color'>;
  match?: Pick<Match, 'id' | 'event_id' | 'match_date'>;
};
type TeamRosterLite = Pick<TeamRoster, 'player_id' | 'team_id' | 'handicap_at_event'>;

type PlayerCard = {
  id: string;
  name: string;
  officialEventHandicap: number | null;
  profileImageUrl: string | null;
  courseHandicap: number | null;
  strokesGiven: number | null;
};

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return 'TBD';
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const date = new Date(`1970-01-01T${normalized}`);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

const formatDate = (dateStr: string) => {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const getDefaultTeamColor = (index: number) =>
  index === 0 ? 'var(--pc-team-a)' : 'var(--pc-team-b)';

const getInitials = (name: string) =>
  name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

// ── Player avatar ─────────────────────────────────────────────────────────────
function PlayerAvatar({
  name,
  imageUrl,
  size = 26,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  if (imageUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          border: '1px solid rgba(0,0,0,0.12)',
        }}
      >
        <Image src={imageUrl} alt={name} width={size} height={size} style={{ objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {getInitials(name)}
    </div>
  );
}

// ── Cup score ─────────────────────────────────────────────────────────────────
function CupScore({
  teams,
  totals,
}: {
  teams: Array<{ id: string; name: string; color: string }>;
  totals: Record<string, number>;
}) {
  if (teams.length < 2) return null;
  const [teamA, teamB] = teams;
  const aScore = totals[teamA.id] ?? 0;
  const bScore = totals[teamB.id] ?? 0;
  const total = aScore + bScore;
  const aPct = total > 0 ? (aScore / total) * 100 : 50;

  const fmt = (v: number) => {
    if (Number.isInteger(v)) return `${v}`;
    const whole = Math.floor(v);
    return v - whole === 0.5 ? (whole > 0 ? `${whole}½` : '½') : v.toFixed(1);
  };

  return (
    <div className={styles.cupCard}>
      <div className={styles.cupInner}>
        <div className={styles.cupTeam}>
          <div className={styles.cupTeamRow}>
            <div className={styles.teamChip} style={{ background: teamA.color }} />
            <span className={styles.cupTeamName}>{teamA.name.toUpperCase()}</span>
          </div>
          <div className={styles.cupScore}>{fmt(aScore)}</div>
        </div>
        <div className={styles.cupVs}>VS</div>
        <div className={`${styles.cupTeam} ${styles.cupTeamRight}`}>
          <div className={styles.cupTeamRow}>
            <span className={styles.cupTeamName}>{teamB.name.toUpperCase()}</span>
            <div className={styles.teamChip} style={{ background: teamB.color }} />
          </div>
          <div className={styles.cupScore}>{fmt(bScore)}</div>
        </div>
      </div>
      <div className={styles.cupProgress}>
        <div className={styles.cupTrack}>
          <div style={{ width: `${aPct}%`, background: teamA.color, height: '100%' }} />
          <div style={{ width: `${100 - aPct}%`, background: teamB.color, height: '100%' }} />
        </div>
      </div>
    </div>
  );
}

// ── Round chip ────────────────────────────────────────────────────────────────
function RoundChip({
  index,
  course,
  active,
  onClick,
}: {
  index: number;
  course: { id: string; name: string; firstDate: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`${styles.roundChip} ${active ? styles.roundChipActive : ''}`}
      onClick={onClick}
    >
      <span className={styles.roundChipTop}>R{index + 1} · {formatDate(course.firstDate)}</span>
      <span className={styles.roundChipCourse}>{course.name}</span>
    </button>
  );
}

// ── Chevron match card ────────────────────────────────────────────────────────
function MatchChevCard({
  match,
  teamA,
  teamB,
  teamAPlayers,
  teamBPlayers,
}: {
  match: MatchWithJoins;
  teamA: { id: string; name: string; color: string };
  teamB: { id: string; name: string; color: string };
  teamAPlayers: PlayerCard[];
  teamBPlayers: PlayerCard[];
}) {
  const isFinished = !!match.winner_team_id || match.is_halved;
  const isWinA = match.winner_team_id === teamA.id;
  const isWinB = match.winner_team_id === teamB.id;

  type ChevState = 'win' | 'lose' | 'halved' | 'pending';
  const stateA: ChevState = match.is_halved ? 'halved' : isWinA ? 'win' : isFinished ? 'lose' : 'pending';
  const stateB: ChevState = match.is_halved ? 'halved' : isWinB ? 'win' : isFinished ? 'lose' : 'pending';

  const chevStyle = (state: ChevState, teamColor: string): React.CSSProperties => {
    if (state === 'win') return { background: teamColor, color: '#fff', borderColor: 'transparent' };
    if (state === 'pending') return { borderColor: teamColor };
    return {};
  };

  return (
    <div className={styles.matchCard}>
      <div className={styles.matchCardHeader}>
        <span className={styles.matchTime}>{formatTime(match.match_time)}</span>
        <span className={styles.matchLabel}>MATCH {match.match_number}</span>
        {match.is_halved && <span className={styles.statusFinal}>HALVED</span>}
        {!match.is_halved && isFinished && <span className={styles.statusFinal}>FINAL</span>}
        {!isFinished && <span className={styles.statusUpcoming}>UPCOMING</span>}
      </div>

      <div className={styles.chevPair}>
        <div
          className={`${styles.chev} ${styles.chevL} ${styles[`chevState_${stateA}`]}`}
          style={chevStyle(stateA, teamA.color)}
        >
          <div className={styles.teamSide}>
            {teamAPlayers.map((p) => (
              <div key={p.id} className={styles.playerRow}>
                <PlayerAvatar name={p.name} imageUrl={p.profileImageUrl} />
                <span className={`${styles.playerName} ${stateA === 'win' ? styles.playerNameWin : ''}`}>
                  {p.name}
                </span>
              </div>
            ))}
            {teamAPlayers.length === 0 && (
              <span className={styles.playerName} style={{ opacity: 0.4 }}>TBD</span>
            )}
          </div>
        </div>

        <div
          className={`${styles.chev} ${styles.chevR} ${styles[`chevState_${stateB}`]}`}
          style={chevStyle(stateB, teamB.color)}
        >
          <div className={`${styles.teamSide} ${styles.teamSideRight}`}>
            {teamBPlayers.map((p) => (
              <div key={p.id} className={`${styles.playerRow} ${styles.playerRowRight}`}>
                <span className={`${styles.playerName} ${stateB === 'win' ? styles.playerNameWin : ''}`}>
                  {p.name}
                </span>
                <PlayerAvatar name={p.name} imageUrl={p.profileImageUrl} />
              </div>
            ))}
            {teamBPlayers.length === 0 && (
              <span className={styles.playerName} style={{ opacity: 0.4 }}>TBD</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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
      if (eventsError) { setError(eventsError.message); return; }
      const eventList = data || [];
      setEvents(eventList);
      const activeEvent = eventList.find((e) => e.is_active);
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
            .select('*, player:players(id, first_name, last_name, profile_image_url), team:teams(id, name, color), match:matches!inner(id,event_id,match_date)')
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

        const teamIds = teamsData.map((t) => t.id);
        if (teamIds.length) {
          const { data: rostersData, error: rostersError } = await supabase
            .from('team_rosters')
            .select('player_id, team_id, handicap_at_event')
            .in('team_id', teamIds);
          if (rostersError) setError(rostersError.message);
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

  const resolvedCourseId = useMemo(() => {
    if (!matchCourses.length) return '';
    const ids = matchCourses.map((c) => c.id);
    if (selectedCourseId && ids.includes(selectedCourseId)) return selectedCourseId;
    return matchCourses[0].id;
  }, [matchCourses, selectedCourseId]);

  useEffect(() => {
    if (!matchCourses.length) { setSelectedCourseId(''); return; }
    const ids = matchCourses.map((c) => c.id);
    if (!selectedCourseId || !ids.includes(selectedCourseId)) {
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

  const handicapByPlayerId = useMemo(
    () => new Map(teamRosters.map((r) => [r.player_id, r.handicap_at_event])),
    [teamRosters],
  );
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const currentEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const eventTeams = teams.map((team, index) => ({
    ...team,
    color: team.color || getDefaultTeamColor(index),
  }));

  const teamTotals = useMemo(() => {
    if (!eventTeams.length) return {};
    return getTeamTotals(matches, eventTeams.map((t) => t.id));
  }, [matches, eventTeams]);

  const filteredMatches = useMemo(
    () =>
      resolvedCourseId
        ? matches
            .filter((m) => (m.course?.id || 'tbd') === resolvedCourseId)
            .sort((a, b) => {
              const at = a.match_time || '99:99';
              const bt = b.match_time || '99:99';
              if (at !== bt) return at.localeCompare(bt);
              return (a.group_number ?? 999) - (b.group_number ?? 999);
            })
        : [],
    [matches, resolvedCourseId],
  );

  const currentCourse = matchCourses.find((c) => c.id === resolvedCourseId);
  const canExportMatches = isAdminRole(role);
  const [teamA, teamB] = eventTeams;

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
          return { playerId: player.id, officialEventHandicap: handicapByPlayerId.get(player.id) ?? null };
        })
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
      const metrics = calculateMatchHandicapMetrics(playersForMetrics, {
        slope: match.course?.slope ?? null,
        rating: match.course?.rating ?? null,
        par: match.course?.par ?? null,
      });
      const sortedRows = playersForMatch
        .map((mp) => {
          const player = mp.player;
          if (!player) return null;
          const m = metrics.get(player.id);
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
            officialEventHandicap: handicapByPlayerId.get(player.id) ?? null,
            courseHandicap: m?.courseHandicap ?? null,
            strokesGiven: m?.strokesGiven ?? null,
          };
        })
        .filter((row): row is EventMatchHandicapStrokesCsvRow => Boolean(row))
        .sort((a, b) => {
          const ts = a.teamName.localeCompare(b.teamName);
          return ts !== 0 ? ts : a.playerName.localeCompare(b.playerName);
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
    <div className={styles.pageRoot}>
      {/* Cup score */}
      <div className={styles.cupWrap}>
        <CupScore teams={eventTeams} totals={teamTotals} />
      </div>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Event selector + export */}
      <div className={styles.controlsRow}>
        <FormControl sx={{ minWidth: 220 }} size="small">
          <InputLabel>Event</InputLabel>
          <Select
            value={selectedEventId}
            label="Event"
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.map((ev) => (
              <MenuItem key={ev.id} value={ev.id}>
                {ev.name} ({ev.year})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {canExportMatches && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleExportMatchHandicaps}
            disabled={loading || matches.length === 0}
          >
            Export Handicaps
          </Button>
        )}
      </div>

      {!loading && matchCourses.length === 0 && selectedEventId && (
        <div className={styles.emptyState}>No matches found for this event.</div>
      )}

      {matchCourses.length > 0 && (
        <>
          {/* Round chip nav */}
          <div className={styles.roundNav}>
            <span className={styles.roundNavLabel}>Rounds</span>
            <div className={styles.roundChips}>
              {matchCourses.map((course, i) => (
                <RoundChip
                  key={course.id}
                  index={i}
                  course={course}
                  active={resolvedCourseId === course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                />
              ))}
            </div>
          </div>

          {currentCourse && (
            <div className={styles.roundHeader}>
              <div className={styles.roundHeaderTitle}>{currentCourse.name}</div>
              <div className={styles.roundHeaderSub}>{formatDate(currentCourse.firstDate)}</div>
            </div>
          )}

          {loading ? (
            <div className={styles.emptyState} style={{ opacity: 0.5 }}>Loading…</div>
          ) : (
            <div className={styles.matchList}>
              {filteredMatches.map((match) => {
                const playersForMatch = matchPlayersByMatchId.get(match.id) || [];

                const buildBase = (mps: MatchPlayerWithJoins[]) =>
                  mps
                    .map((mp) => {
                      const player = mp.player;
                      if (!player) return null;
                      return {
                        id: player.id,
                        name: `${player.first_name} ${player.last_name}`.trim(),
                        officialEventHandicap: handicapByPlayerId.get(player.id) ?? null,
                        profileImageUrl: player.profile_image_url || null,
                      };
                    })
                    .filter((p): p is NonNullable<typeof p> => Boolean(p))
                    .sort((a, b) => a.name.localeCompare(b.name));

                const aRaw = teamA ? playersForMatch.filter((mp) => mp.team_id === teamA.id) : [];
                const bRaw = teamB ? playersForMatch.filter((mp) => mp.team_id === teamB.id) : [];
                const aBase = buildBase(aRaw);
                const bBase = buildBase(bRaw);
                const allBase = [...aBase, ...bBase];

                const metrics = calculateMatchHandicapMetrics(
                  allBase.map((p) => ({ playerId: p.id, officialEventHandicap: p.officialEventHandicap })),
                  {
                    slope: match.course?.slope ?? null,
                    rating: match.course?.rating ?? null,
                    par: match.course?.par ?? null,
                  },
                );

                const withMetrics = (p: (typeof aBase)[0]): PlayerCard => {
                  const m = metrics.get(p.id);
                  return { ...p, courseHandicap: m?.courseHandicap ?? null, strokesGiven: m?.strokesGiven ?? null };
                };

                if (!teamA || !teamB) return null;

                return (
                  <MatchChevCard
                    key={match.id}
                    match={match}
                    teamA={teamA}
                    teamB={teamB}
                    teamAPlayers={aBase.map(withMetrics)}
                    teamBPlayers={bBase.map(withMetrics)}
                  />
                );
              })}
              {filteredMatches.length === 0 && (
                <div className={styles.emptyState}>No matches for this round.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
