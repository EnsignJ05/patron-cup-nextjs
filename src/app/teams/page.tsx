'use client';
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { supabase } from '@/lib/supabaseClient';

export default function TeamsPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    supabase
      .from('branson_roster')
      .select('f_name, l_name, handicap, team')
      .then(({ data, error }) => {
        if (error) {
          setFetchError(error.message);
          setPlayers([]);
        } else {
          setPlayers(data || []);
        }
        setLoading(false);
      });
  }, []);

  const thompsonPlayers = players.filter(p => p.team === 1);
  const berasteguiPlayers = players.filter(p => p.team === 2);

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
      {fetchError && <Typography color="error">{fetchError}</Typography>}

      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 4,
          width: '100%',
          maxWidth: 900,
        }}
      >
        {/* Team Thompson */}
        <Box 
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
              color: '#3498db',
              mb: 3,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontWeight: 700,
            }}
          >
            Team Thompson
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {thompsonPlayers.map((player, idx) => (
              <Typography
                key={idx}
                variant="body1"
                sx={{
                  color: '#1976d2',
                  py: 0.5,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {player.f_name} {player.l_name}
                <span style={{ color: '#666666', fontSize: 14, marginLeft: 8 }}>
                  ({player.handicap})
                </span>
              </Typography>
            ))}
          </Box>
        </Box>

        {/* Team Burgess */}
        <Box 
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
              color: '#e74c3c',
              mb: 3,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontWeight: 700,
            }}
          >
            Team Berastegui
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {berasteguiPlayers.map((player, idx) => (
              <Typography
                key={idx}
                variant="body1"
                sx={{
                  color: '#1976d2',
                  py: 0.5,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {player.f_name} {player.l_name}
                <span style={{ color: '#666666', fontSize: 14, marginLeft: 8 }}>
                  ({player.handicap})
                </span>
              </Typography>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 