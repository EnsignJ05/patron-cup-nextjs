'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Player } from '@/types/database';
import styles from './page.module.css';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('status', 'active')
      .order('last_name', { ascending: true });

    if (!error && data) {
      setPlayers(data);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const filteredPlayers = players.filter((player) => {
    const search = searchTerm.toLowerCase();
    return (
      player.first_name.toLowerCase().includes(search) ||
      player.last_name.toLowerCase().includes(search)
    );
  });

  return (
    <Box className={styles.pageRoot}>
      <Typography variant="h4" className={styles.pageTitle}>
        Players
      </Typography>
      <Typography variant="body1" className={styles.pageSubtitle}>
        Browse all players in the Patron Cup
      </Typography>

      <Box className={styles.searchWrap}>
        <TextField
          placeholder="Search players..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchField}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow className={styles.tableHeaderRow}>
              <TableCell className={styles.tableHeaderCell}>Player</TableCell>
              <TableCell className={styles.tableHeaderCell}>Handicap</TableCell>
              <TableCell className={styles.tableHeaderCell}>GHIN club</TableCell>
              <TableCell className={styles.tableHeaderCell}>Location</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No players found
                </TableCell>
              </TableRow>
            ) : (
              filteredPlayers.map((player) => (
                <TableRow 
                  key={player.id} 
                  hover
                  className={styles.playerRow}
                >
                  <TableCell>
                    <Link 
                      href={`/players/${player.id}`}
                      className={styles.playerLink}
                    >
                      <Avatar
                        src={player.profile_image_url || undefined}
                        alt={`${player.first_name} ${player.last_name}`}
                        className={styles.playerAvatar}
                      >
                        {!player.profile_image_url && `${player.first_name[0]}${player.last_name[0]}`}
                      </Avatar>
                      <Box>
                        <Typography
                          className={styles.playerName}
                        >
                          {player.first_name} {player.last_name}
                        </Typography>
                      </Box>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {player.current_handicap !== null ? (
                      <Chip label={player.current_handicap} size="small" color="primary" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{player.ghin_club?.trim() ? player.ghin_club : '—'}</TableCell>
                  <TableCell>
                    {player.city && player.state ? `${player.city}, ${player.state}` : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
