'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { styles } from '@/styles/pages/tee-times/player/styles';
import PlayerMatches from '@/components/player/PlayerMatches';
import PlayerRerounds from '@/components/player/PlayerRerounds';
import { supabase } from '@/lib/supabaseClient';
import { unformatPlayerSlug } from '@/utils/playerUtils';
import { getPlayerRecord } from '@/lib/getPlayerRecord';

export default function PlayerPageClient({ playerSlug }) {
  const [player, setPlayer] = useState(null);
  const [record, setRecord] = useState({ wins: 0, losses: 0, ties: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Parse slug to get first and last name
    const name = unformatPlayerSlug(playerSlug);
    const [f_name, ...rest] = name.split(' ');
    const l_name = rest.join(' ');
    // Query for player
    supabase
      .from('player')
      .select('id, f_name, l_name, handicap')
      .eq('f_name', f_name)
      .eq('l_name', l_name)
      .single()
      .then(async ({ data: playerData, error: playerError }) => {
        if (playerError || !playerData) {
          setPlayer(null);
          setRecord({ wins: 0, losses: 0, ties: 0 });
          setLoading(false);
          return;
        }
        setPlayer(playerData);
        // Use new getPlayerRecord function
        const record = await getPlayerRecord(f_name, l_name);
        setRecord(record || { wins: 0, losses: 0, ties: 0 });
        setLoading(false);
      });
  }, [playerSlug]);

  if (loading) {
    return (
      <Box sx={styles.container}>
        <Typography variant="h3" sx={styles.title}>
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!player) {
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
        {player.f_name} {player.l_name}
      </Typography>

      <Card sx={styles.playerCard}>
        <CardContent sx={styles.playerInfo}>
          <Typography variant="h4" sx={styles.playerName}>
            {player.f_name} {player.l_name}
          </Typography>
          <Box sx={styles.playerDetails}>
            <Typography>Handicap: {player.handicap}</Typography>
            <Typography>
              2025 Record: {record.wins}-{record.losses}-{record.ties}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Box sx={styles.matchesContainer}>
        <PlayerMatches
          playerId={player.id}
        />
      </Box>

      <Box sx={styles.reroundsContainer}>
        <PlayerRerounds playerName={`${player.f_name} ${player.l_name}`} />
      </Box>
    </Box>
  );
} 