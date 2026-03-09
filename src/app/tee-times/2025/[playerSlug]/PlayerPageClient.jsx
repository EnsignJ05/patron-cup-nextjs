'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import PlayerMatches from '@/components/player/PlayerMatches';
import PlayerRerounds from '@/components/player/PlayerRerounds';
import { supabase } from '@/lib/supabaseClient';
import { unformatPlayerSlug } from '@/utils/playerUtils';
import { getPlayerRecord } from '@/lib/getPlayerRecord';
import styles from './page.module.css';

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
      <Box className={styles.container}>
        <Typography variant="h3" className={styles.title}>
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!player) {
    return (
      <Box className={styles.container}>
        <Typography variant="h3" className={styles.title}>
          Player Not Found
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.container}>
      <Typography variant="h3" className={styles.title}>
        {player.f_name} {player.l_name}
      </Typography>

      <Card className={styles.playerCard}>
        <CardContent className={styles.playerInfo}>
          <Typography variant="h4" className={styles.playerName}>
            {player.f_name} {player.l_name}
          </Typography>
          <Box className={styles.playerDetails}>
            <Typography>Handicap: {player.handicap}</Typography>
            <Typography>
              2025 Record: {record.wins}-{record.losses}-{record.ties}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Box className={styles.matchesContainer}>
        <PlayerMatches
          playerId={player.id}
        />
      </Box>

      <Box className={styles.reroundsContainer}>
        <PlayerRerounds playerName={`${player.f_name} ${player.l_name}`} />
      </Box>
    </Box>
  );
} 