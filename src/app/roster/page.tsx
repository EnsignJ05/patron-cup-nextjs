'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TextField from '@mui/material/TextField';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { PUBLIC_PLAYER_EMBED, type PublicPlayer } from '@/lib/playerColumns';
import styles from './page.module.css';

type TeamInfo = { id: string; name: string; color: string };

type RosterRow = {
  id: string;
  handicap_at_event: number | null;
  player: PublicPlayer;
};

type RosterEntry = {
  rosterId: string;
  player: PublicPlayer;
  teamId: string;
  handicap: number | null;
  isCaptain: boolean;
};

const getDefaultTeamColor = (index: number) =>
  index === 0 ? 'var(--pc-team-a)' : 'var(--pc-team-b)';

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

function PlayerAvatar({ player, size = 36 }: { player: PublicPlayer; size?: number }) {
  const name = `${player.first_name} ${player.last_name}`;
  if (player.profile_image_url) {
    return (
      <div className={styles.avatarImgWrap} style={{ width: size, height: size }}>
        <Image
          src={player.profile_image_url}
          alt={name}
          width={size}
          height={size}
          style={{ objectFit: 'cover' }}
        />
      </div>
    );
  }
  return (
    <div className={styles.avatar} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {getInitials(player.first_name, player.last_name)}
    </div>
  );
}

export default function RosterPage() {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [segment, setSegment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: activeEvent, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('is_active', true)
      .single();

    if (eventError || !activeEvent) {
      setError('No active event found');
      setLoading(false);
      return;
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, color')
      .eq('event_id', activeEvent.id)
      .order('name');

    if (teamsError) {
      setError(teamsError.message);
      setLoading(false);
      return;
    }

    const resolvedTeams: TeamInfo[] = (teamsData || []).map((team, index) => ({
      id: team.id,
      name: team.name,
      color: team.color || getDefaultTeamColor(index),
    }));

    const rostersByTeam = await Promise.all(
      resolvedTeams.map(async (team) => {
        const { data } = await supabase
          .from('team_rosters')
          .select(`id, handicap_at_event, player:players(${PUBLIC_PLAYER_EMBED})`)
          .eq('team_id', team.id)
          .order('player(last_name)');
        return { team, rows: (data || []) as unknown as RosterRow[] };
      }),
    );

    const captainIds = new Set<string>();
    if (resolvedTeams.length > 0) {
      const { data: captainsData } = await supabase
        .from('team_captains')
        .select('player_id')
        .in(
          'team_id',
          resolvedTeams.map((t) => t.id),
        );
      for (const row of (captainsData || []) as Array<{ player_id: string }>) {
        captainIds.add(row.player_id);
      }
    }

    const entries: RosterEntry[] = rostersByTeam.flatMap(({ team, rows }) =>
      rows
        .filter((row) => row.player && row.player.status === 'active')
        .map((row) => ({
          rosterId: row.id,
          player: row.player,
          teamId: team.id,
          handicap: row.handicap_at_event ?? row.player.current_handicap,
          isCaptain: captainIds.has(row.player.id),
        })),
    );

    entries.sort((a, b) => a.player.last_name.localeCompare(b.player.last_name));

    setTeams(resolvedTeams);
    setRoster(entries);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const teamSummaries = useMemo(
    () =>
      teams.map((team) => {
        const members = roster.filter((r) => r.teamId === team.id);
        const withHandicap = members.filter(
          (m): m is RosterEntry & { handicap: number } => m.handicap !== null,
        );
        const avg = withHandicap.length
          ? withHandicap.reduce((sum, m) => sum + m.handicap, 0) / withHandicap.length
          : null;
        const captain = members.find((m) => m.isCaptain) ?? null;
        return { team, count: members.length, avg, captain };
      }),
    [teams, roster],
  );

  const segments = useMemo(
    () => [
      { id: 'all', label: 'All', count: roster.length, color: null as string | null },
      ...teams.map((team) => ({
        id: team.id,
        label: team.name,
        count: roster.filter((r) => r.teamId === team.id).length,
        color: team.color,
      })),
    ],
    [teams, roster],
  );

  const visiblePlayers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return roster
      .filter((entry) => segment === 'all' || entry.teamId === segment)
      .filter((entry) => {
        if (!term) return true;
        const name = `${entry.player.first_name} ${entry.player.last_name}`.toLowerCase();
        return name.includes(term);
      });
  }, [roster, segment, searchTerm]);

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <span className={styles.label}>The Field · {roster.length} patrons</span>
          <h1 className={styles.displayHeading}>Roster</h1>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {teamSummaries.length > 0 && (
          <div className={styles.teamSummaryGrid}>
            {teamSummaries.map(({ team, count, avg, captain }) => (
              <div
                key={team.id}
                className={styles.teamSummaryCard}
                style={{ borderLeftColor: team.color }}
              >
                <div className={styles.teamSummaryTop}>
                  <span className={styles.label}>Team</span>
                  <span className={styles.monoText}>{count}</span>
                </div>
                <div className={styles.teamSummaryName}>{team.name}</div>
                {captain && (
                  <div className={styles.teamSummaryCaptain}>
                    ★ {captain.player.first_name} {captain.player.last_name}
                  </div>
                )}
                <div className={styles.teamSummaryBottom}>
                  <span className={styles.label}>Avg HCP</span>
                  <span className={styles.monoText}>{avg !== null ? avg.toFixed(1) : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.segmented}>
          {segments.map((seg) => (
            <button
              key={seg.id}
              type="button"
              className={`${styles.segment} ${segment === seg.id ? styles.segmentActive : ''}`}
              onClick={() => setSegment(seg.id)}
            >
              {seg.color && <span className={styles.segmentChip} style={{ background: seg.color }} />}
              <span>{seg.label}</span>
              <span className={styles.segmentCount}>{seg.count}</span>
            </button>
          ))}
        </div>

        <TextField
          placeholder="Search players..."
          variant="outlined"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchField}
        />

        <div className={styles.playerList}>
          {loading ? (
            <p className={styles.emptyState}>Loading...</p>
          ) : visiblePlayers.length === 0 ? (
            <p className={styles.emptyState}>No players found</p>
          ) : (
            visiblePlayers.map((entry) => {
              const team = teamById.get(entry.teamId);
              return (
                <Link
                  key={entry.rosterId}
                  href={`/players/${entry.player.id}`}
                  className={styles.playerRow}
                >
                  <div className={styles.playerAvatarWrap}>
                    <PlayerAvatar player={entry.player} />
                    {team && <span className={styles.teamDot} style={{ background: team.color }} />}
                  </div>
                  <div className={styles.playerInfo}>
                    <div className={styles.playerName}>
                      {entry.player.first_name} {entry.player.last_name}
                      {entry.isCaptain && (
                        <span className={styles.captBadge} style={{ color: team?.color }}>
                          CAPT
                        </span>
                      )}
                    </div>
                    <div className={styles.playerMeta}>
                      {team?.name.toUpperCase()}
                      {entry.player.city && entry.player.state
                        ? ` · ${entry.player.city}, ${entry.player.state}`
                        : ''}
                    </div>
                  </div>
                  {entry.handicap !== null && (
                    <div className={styles.handicapChip}>{entry.handicap.toFixed(1)}</div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
