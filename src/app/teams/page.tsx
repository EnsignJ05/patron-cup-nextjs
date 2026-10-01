'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Team, TeamRoster } from '@/types/database';
import { PUBLIC_PLAYER_EMBED, type PublicPlayer } from '@/lib/playerColumns';
import styles from './page.module.css';

interface TeamWithPlayers extends Team {
  players: (TeamRoster & { player: PublicPlayer })[];
}

const getDefaultTeamColor = (index: number) =>
  index === 0 ? 'var(--pc-team-a)' : 'var(--pc-team-b)';

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

function PlayerAvatar({ player, size = 32 }: { player: PublicPlayer; size?: number }) {
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

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [captainIds, setCaptainIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const fetchTeamsAndPlayers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // First, get the active event
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

      // Get teams for the active event
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('event_id', activeEvent.id)
        .order('name');

      if (teamsError) {
        setError(teamsError.message);
        setLoading(false);
        return;
      }

      // For each team, get their roster with player details
      const teamsWithPlayers = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { data: rosterData } = await supabase
            .from('team_rosters')
            .select(`*, player:players(${PUBLIC_PLAYER_EMBED})`)
            .eq('team_id', team.id)
            .order('player(last_name)');

          return {
            ...team,
            players: rosterData || [],
          };
        })
      );

      if (teamsWithPlayers.length > 0) {
        const { data: captainsData } = await supabase
          .from('team_captains')
          .select('player_id')
          .in(
            'team_id',
            teamsWithPlayers.map((t) => t.id),
          );
        setCaptainIds(new Set((captainsData || []).map((c: { player_id: string }) => c.player_id)));
      }

      setTeams(teamsWithPlayers);
    } catch (err) {
      setError('Failed to load teams');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTeamsAndPlayers();
  }, [fetchTeamsAndPlayers]);

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <span className={styles.label}>The Field</span>
          <h1 className={styles.displayHeading}>Teams</h1>
        </div>

        {loading && <p className={styles.emptyState}>Loading...</p>}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.teamGrid}>
          {teams.map((team, index) => {
            const color = team.color || getDefaultTeamColor(index);
            const sortedPlayers = [...team.players].sort((a, b) =>
              a.player.last_name.localeCompare(b.player.last_name),
            );

            return (
              <div key={team.id} className={styles.teamCard} style={{ borderTopColor: color }}>
                <div className={styles.teamHeader}>
                  <span className={styles.teamChip} style={{ background: color }} />
                  <h2 className={styles.teamName}>{team.name}</h2>
                  <span className={styles.teamCount}>{sortedPlayers.length}</span>
                </div>
                <div className={styles.playerList}>
                  {sortedPlayers.map((roster) => {
                    const player = roster.player;
                    const handicap = roster.handicap_at_event ?? player.current_handicap;
                    const isCaptain = captainIds.has(player.id);

                    return (
                      <Link key={roster.id} href={`/players/${player.id}`} className={styles.playerRow}>
                        <PlayerAvatar player={player} />
                        <div className={styles.playerInfo}>
                          <div className={styles.playerName}>
                            {player.first_name} {player.last_name}
                            {isCaptain && (
                              <span className={styles.captBadge} style={{ color }}>
                                CAPT
                              </span>
                            )}
                          </div>
                        </div>
                        {handicap !== null && <div className={styles.handicapChip}>{handicap}</div>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
