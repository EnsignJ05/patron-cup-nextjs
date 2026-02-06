import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import DashboardProfileForm from '@/components/player/DashboardProfileForm';
import PlayerMatches from '@/components/player/PlayerMatches';
import PlayerRerounds from '@/components/player/PlayerRerounds';
import PlayerStats from '@/components/player/PlayerStats';

export default async function PlayerProfilePage({ params }: { params: { playerId: string } }) {
  const supabase = await createSupabaseServerClient();
  
  // Get the player info
  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', params.playerId)
    .single();

  if (error || !player) {
    notFound();
  }

  // Check if current user can edit this profile
  const { data } = await supabase.auth.getUser();
  const currentUser = data?.user;
  
  let canEdit = false;
  if (currentUser) {
    // Get current user's player record
    const { data: currentPlayerRecord } = await supabase
      .from('players')
      .select('id, role, auth_user_id')
      .eq('auth_user_id', currentUser.id)
      .single();

    // Can edit if: same player, admin, or committee
    canEdit = 
      currentPlayerRecord?.id === player.id || 
      currentPlayerRecord?.role === 'admin' || 
      currentPlayerRecord?.role === 'committee';
  }

  // Calculate player's record from match_players
  const { data: matchPlayers } = await supabase
    .from('match_players')
    .select('is_winner, match:matches(is_halved)')
    .eq('player_id', params.playerId);

  let wins = 0;
  let losses = 0;
  let ties = 0;

  if (matchPlayers) {
    matchPlayers.forEach((mp: any) => {
      if (mp.match?.is_halved) {
        ties++;
      } else if (mp.is_winner) {
        wins++;
      } else {
        losses++;
      }
    });
  }

  const record = { wins, losses, ties };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: { xs: 4, sm: 8 },
        px: { xs: 2, sm: 4 },
      }}
    >
      <Avatar
        src={player.profile_image_url || undefined}
        alt={`${player.first_name} ${player.last_name}`}
        sx={{
          width: 120,
          height: 120,
          mb: 2,
          fontSize: '3rem',
          bgcolor: '#1976d2',
        }}
      >
        {!player.profile_image_url && `${player.first_name[0]}${player.last_name[0]}`}
      </Avatar>

      <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, color: '#2c3e50' }}>
        {player.first_name} {player.last_name}
      </Typography>

      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50' }}>
          Profile Information
        </Typography>
        
        <DashboardProfileForm
          playerId={player.id}
          firstName={player.first_name}
          lastName={player.last_name}
          phone={player.phone ?? ''}
          handicap={player.current_handicap?.toString() ?? ''}
          profileImageUrl={player.profile_image_url ?? ''}
          readOnly={!canEdit}
        />
      </Paper>

      {/* Player Stats */}
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50' }}>
          Statistics
        </Typography>
        <PlayerStats 
          handicap={player.current_handicap ?? 'N/A'} 
          record={record}
        />
      </Paper>

      {/* Player Matches */}
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50' }}>
          Matches
        </Typography>
        <PlayerMatches playerId={player.id} />
      </Paper>

      {/* Player Rerounds */}
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50' }}>
          Re-Rounds
        </Typography>
        <PlayerRerounds playerName={`${player.first_name} ${player.last_name}`} />
      </Paper>
    </Box>
  );
}
