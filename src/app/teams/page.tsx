'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import matchesData from '@/data/matches.json';

interface Player {
  name: string;
  handicap: number | string;
}

function getTeamPlayers(team: 'Thompson' | 'Burgess'): Player[] {
  const playerMap = new Map<string, Player>();
  matchesData.matches.forEach(match => {
    const teamPlayers = team === 'Thompson' ? match.team_thompson : match.team_burgess;
    teamPlayers.forEach(player => {
      if (!playerMap.has(player.name)) {
        playerMap.set(player.name, player);
      }
    });
  });
  return Array.from(playerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function TeamsPage() {
  const thompsonPlayers = getTeamPlayers('Thompson');
  const burgessPlayers = getTeamPlayers('Burgess');

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
            {thompsonPlayers.map((player) => (
              <Link 
                key={player.name}
                href={`/tee-times/2025/${player.name.toLowerCase().replace(/\s+/g, '-')}`}
                style={{ textDecoration: 'none' }}
              >
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#1976d2',
                    py: 0.5,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    '&:hover': {
                      color: '#1565c0',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {player.name} <span style={{ color: '#666666', fontSize: 14 }}>({player.handicap})</span>
                </Typography>
              </Link>
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
            Team Burgess
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {burgessPlayers.map((player) => (
              <Link 
                key={player.name}
                href={`/tee-times/2025/${player.name.toLowerCase().replace(/\s+/g, '-')}`}
                style={{ textDecoration: 'none' }}
              >
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#1976d2',
                    py: 0.5,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    '&:hover': {
                      color: '#1565c0',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {player.name} <span style={{ color: '#666666', fontSize: 14 }}>({player.handicap})</span>
                </Typography>
              </Link>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 