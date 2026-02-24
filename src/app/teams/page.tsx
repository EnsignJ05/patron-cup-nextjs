'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Team, Player, TeamRoster } from '@/types/database';

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
  const getTeamColor = (teamName: string, color?: string | null) => {
    if (color) return color;
    // Default colors based on team name
    if (teamName.toLowerCase().includes('thompson')) return '#3498db';
    if (teamName.toLowerCase().includes('berastegui')) return '#e74c3c';
    return '#3498db';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: { xs: 4, sm: 8 },
        px: { xs: 2, sm: 4 },
      }}
    >
      <Typography 
        variant="h3" 
        sx={{ 
          color: '#2c3e50',
          mb: 4,
          fontSize: { xs: '1.75rem', sm: '2.5rem' },
          textAlign: 'center',
        }}
      >
        Teams
      </Typography>

      <Typography 
        variant="body2" 
        sx={{ 
          color: '#2c3e50',
          mb: 4,
          textAlign: 'center',
          fontWeight: 700,
          fontStyle: 'italic',
          maxWidth: 600,
        }}
      >
        Click on a player&apos;s name to view their match schedule and additional rounds
      </Typography>

      {loading && <Typography>Loading...</Typography>}
      {error && <Typography color="error">{error}</Typography>}

      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 4,
          width: '100%',
          maxWidth: 900,
        }}
      >
        {teams.map((team) => {
          const teamColor = getTeamColor(team.name, team.color);
          const sortedPlayers = [...team.players].sort((a, b) => 
            a.player.last_name.localeCompare(b.player.last_name)
          );

          return (
            <Box 
              key={team.id}
              sx={{ 
                flex: 1,
                bgcolor: '#ffffff',
                borderRadius: 2,
                p: 3,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              <Typography 
                variant="h4" 
                sx={{ 
                  color: teamColor,
                  mb: 3,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                  fontWeight: 700,
                }}
              >
                {team.name}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sortedPlayers.map((roster) => {
                  const player = roster.player;
                  const handicap = roster.handicap_at_event ?? player.current_handicap;

                  return (
                    <Box
                      key={roster.id}
                      sx={{
                        py: 0.5,
                      }}
                    >
                      <Link 
                        href={`/players/${player.id}`}
                        style={{
                          textDecoration: 'none',
                          color: '#1976d2',
                          fontSize: '1.1rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            color: '#1976d2',
                            fontSize: { xs: '1rem', sm: '1.1rem' },
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {player.first_name} {player.last_name}
                        </Typography>
                        {handicap !== null && (
                          <span style={{ color: '#666666', fontSize: 14, marginLeft: 8 }}>
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