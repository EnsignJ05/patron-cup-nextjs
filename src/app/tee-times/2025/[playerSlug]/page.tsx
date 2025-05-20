'use client';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { getPlayerMatches, getPlayerRerounds, getPlayerHandicap, getPlayerRecord, unformatPlayerSlug } from '@/utils/playerUtils';
import PlayerMatches from '@/components/player/PlayerMatches';
import PlayerRerounds from '@/components/player/PlayerRerounds';
import PlayerStats from '@/components/player/PlayerStats';

export default function PlayerPage() {
  const { playerSlug } = useParams();
  const playerName = unformatPlayerSlug(playerSlug as string);
  const matches = getPlayerMatches(playerName);
  const rerounds = getPlayerRerounds(playerName);
  const handicap = getPlayerHandicap(playerName);
  const record = getPlayerRecord(playerName);

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
      <Box sx={{ width: '100%', maxWidth: 900 }}>
        <Typography 
          variant="h3" 
          sx={{ 
            color: '#2c3e50',
            mb: 4,
            fontSize: { xs: '1.75rem', sm: '2.5rem' },
            textAlign: 'center',
          }}
        >
          {playerName}
        </Typography>

        <PlayerStats 
          handicap={handicap}
          record={record}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#2c3e50',
                mb: 3,
                fontSize: { xs: '1.5rem', sm: '2rem' },
                textAlign: 'center',
              }}
            >
              Tournament Matches
            </Typography>
            <PlayerMatches playerName={playerName} matches={matches} />
          </Box>

          <PlayerRerounds rerounds={rerounds} />
        </Box>
      </Box>
    </Box>
  );
} 