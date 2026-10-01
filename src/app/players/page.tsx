'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TextField from '@mui/material/TextField';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { PUBLIC_PLAYER_SELECT, type PublicPlayer } from '@/lib/playerColumns';
import styles from './page.module.css';

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

function PlayerAvatar({ player, size = 40 }: { player: PublicPlayer; size?: number }) {
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

export default function PlayersPage() {
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select<string, PublicPlayer>(PUBLIC_PLAYER_SELECT)
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

  const filteredPlayers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return players;
    return players.filter((player) => {
      const name = `${player.first_name} ${player.last_name}`.toLowerCase();
      return name.includes(term);
    });
  }, [players, searchTerm]);

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <span className={styles.label}>Directory · {players.length} patrons</span>
          <h1 className={styles.displayHeading}>Players</h1>
        </div>

        <TextField
          placeholder="Search players..."
          variant="outlined"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchField}
        />

        <div className={styles.playerList}>
          {loading ? (
            <p className={styles.emptyState}>Loading...</p>
          ) : filteredPlayers.length === 0 ? (
            <p className={styles.emptyState}>No players found</p>
          ) : (
            filteredPlayers.map((player) => (
              <Link key={player.id} href={`/players/${player.id}`} className={styles.playerRow}>
                <PlayerAvatar player={player} />
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>
                    {player.first_name} {player.last_name}
                  </div>
                  <div className={styles.playerMeta}>
                    {player.ghin_club?.trim() ? player.ghin_club : 'No GHIN club'}
                    {player.city && player.state ? ` · ${player.city}, ${player.state}` : ''}
                  </div>
                </div>
                {player.current_handicap !== null && (
                  <div className={styles.handicapChip}>{player.current_handicap}</div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
