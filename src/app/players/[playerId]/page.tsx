import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import DashboardProfileForm from '@/components/player/DashboardProfileForm';
// import PlayerRerounds from '@/components/player/PlayerRerounds';
// import PlayerStats from '@/components/player/PlayerStats';

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return 'TBD';
  const date = new Date(`2000-01-01T${timeStr}`);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default async function PlayerProfilePage({ params }: { params: Promise<{ playerId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { playerId } = await params;
  
  // Get the player info
  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
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

    // Can edit if: same player or admin
    canEdit = 
      currentPlayerRecord?.id === player.id || 
      currentPlayerRecord?.role === 'admin';
  }

  // Calculate player's record from match_players (disabled for now)
  // const { data: matchPlayers } = await supabase
  //   .from('match_players')
  //   .select('is_winner, match:matches(is_halved)')
  //   .eq('player_id', playerId);
  //
  // let wins = 0;
  // let losses = 0;
  // let ties = 0;
  //
  // if (matchPlayers) {
  //   matchPlayers.forEach((mp: any) => {
  //     if (mp.match?.is_halved) {
  //       ties++;
  //     } else if (mp.is_winner) {
  //       wins++;
  //     } else {
  //       losses++;
  //     }
  //   });
  // }
  //
  // const record = { wins, losses, ties };

  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name, year')
    .eq('is_active', true)
    .single();

  let reroundsList: Array<{
    id: string;
    reround_date: string;
    reround_time: string | null;
    course?: { name?: string | null } | null;
    player1_id: string | null;
    player2_id: string | null;
    player3_id: string | null;
    player4_id: string | null;
  }> = [];
  let reroundPlayersById = new Map<string, { first_name: string; last_name: string }>();

  if (activeEvent?.id) {
    const { data: rerounds } = await supabase
      .from('rerounds')
      .select('id, reround_date, reround_time, course:courses(name), player1_id, player2_id, player3_id, player4_id')
      .eq('event_id', activeEvent.id)
      .or(
        `player1_id.eq.${playerId},player2_id.eq.${playerId},player3_id.eq.${playerId},player4_id.eq.${playerId}`
      );

    reroundsList = (rerounds || []).map((reround) => ({
      ...reround,
      course: Array.isArray(reround.course) ? reround.course[0] : reround.course,
    }));

    const playerIds = Array.from(
      new Set(
        reroundsList
          .flatMap((reround) => [
            reround.player1_id,
            reround.player2_id,
            reround.player3_id,
            reround.player4_id,
          ])
          .filter((id): id is string => Boolean(id))
      )
    );

    if (playerIds.length > 0) {
      const { data: reroundPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .in('id', playerIds);

      reroundPlayersById = new Map(
        (reroundPlayers || []).map((player) => [player.id, { first_name: player.first_name, last_name: player.last_name }])
      );
    }
  }

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
  {/* <Paper
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
  </Paper> */}

      {/* Player Rerounds */}
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
          Re-Rounds {activeEvent ? `· ${activeEvent.name} ${activeEvent.year}` : ''}
        </Typography>
        {reroundsList.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#666' }}>
            No re-rounds scheduled for this player yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {reroundsList.map((reround) => {
              const playerNames = [
                reround.player1_id,
                reround.player2_id,
                reround.player3_id,
                reround.player4_id,
              ]
                .map((id) => {
                  if (!id) return 'TBD';
                  const reroundPlayer = reroundPlayersById.get(id);
                  return reroundPlayer ? `${reroundPlayer.first_name} ${reroundPlayer.last_name}` : 'TBD';
                })
                .join(', ');

              return (
                <Box key={reround.id} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {formatDate(reround.reround_date)} · {formatTime(reround.reround_time)} ·{' '}
                    {reround.course?.name || 'Course TBD'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#2c3e50' }}>
                    {playerNames}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
