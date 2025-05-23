'use client';
import { use } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { styles } from '@/styles/pages/tee-times/player/styles';
import PlayerMatches from '@/components/player/PlayerMatches';
import PlayerRerounds from '@/components/player/PlayerRerounds';
import { getPlayerData } from '@/utils/playerData';

export default function PlayerPage({ params }: { params: Promise<{ playerSlug: string }> }) {
  const { playerSlug } = use(params);

  const playerData = getPlayerData(playerSlug);
  if (!playerData) {
    return (
      <Box sx={styles.container}>
        <Typography variant="h3" sx={styles.title}>
          Player Not Found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={styles.container}>
      <Typography variant="h3" sx={styles.title}>
        {playerData.name}
      </Typography>

      <Card sx={styles.playerCard}>
        <CardContent sx={styles.playerInfo}>
          <Typography variant="h4" sx={styles.playerName}>
            {playerData.name}
          </Typography>
          <Box sx={styles.playerDetails}>
            <Typography>Handicap: {playerData.handicap}</Typography>
            <Typography>
              2025 Record: {playerData.record.wins}-{playerData.record.losses}-{playerData.record.ties}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Box sx={styles.matchesContainer}>
        <PlayerMatches
          playerName={playerData.name}
        />
      </Box>

      <Box sx={styles.reroundsContainer}>
        <PlayerRerounds playerName={playerData.name} />
      </Box>
    </Box>
  );
} 