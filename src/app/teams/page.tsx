'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Team, Player, TeamRoster } from '@/types/database';
import styles from './page.module.css';

interface TeamWithPlayers extends Team {
  players: (TeamRoster & { player: Player })[];
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
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
            .select('*, player:players(*)')
            .eq('team_id', team.id)
            .order('player(last_name)');

          return {
            ...team,
            players: rosterData || [],
          };
        })
      );

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

  // Determine team colors dynamically or use defaults
  const getTeamClass = (teamName: string, color?: string | null) => {
    if (color === '#e74c3c') return styles.teamBurgess;
    if (color === '#3498db') return styles.teamThompson;
    if (teamName.toLowerCase().includes('thompson')) return styles.teamThompson;
    if (teamName.toLowerCase().includes('berastegui')) return styles.teamBurgess;
    return styles.teamThompson;
  };

  return (
    <Box className={styles.pageRoot}>
      <Typography 
        variant="h3" 
        className={styles.pageTitle}
      >
        Teams
      </Typography>

      <Typography 
        variant="body2" 
        className={styles.pageSubtitle}
      >
        Click on a player&apos;s name to view their match schedule and additional rounds
      </Typography>

      {loading && <Typography>Loading...</Typography>}
      {error && <Typography color="error">{error}</Typography>}

      <Box className={styles.teamGrid}>
        {teams.map((team) => {
          const teamClass = getTeamClass(team.name, team.color);
          const sortedPlayers = [...team.players].sort((a, b) => 
            a.player.last_name.localeCompare(b.player.last_name)
          );

          return (
            <Box 
              key={team.id}
              className={styles.teamCard}
            >
              <Typography 
                variant="h4" 
                className={`${styles.teamName} ${teamClass}`}
              >
                {team.name}
              </Typography>
              <Box className={styles.playerList}>
                {sortedPlayers.map((roster) => {
                  const player = roster.player;
                  const handicap = roster.handicap_at_event ?? player.current_handicap;

                  return (
                    <Box
                      key={roster.id}
                      className={styles.playerItem}
                    >
                      <Link 
                        href={`/players/${player.id}`}
                        className={styles.playerLink}
                      >
                        <Typography
                          component="span"
                          className={styles.playerName}
                        >
                          {player.first_name} {player.last_name}
                        </Typography>
                        {handicap !== null && (
                          <span className={styles.playerHandicap}>
                            ({handicap})
                          </span>
                        )}
                      </Link>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
} 