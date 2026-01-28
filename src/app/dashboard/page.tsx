import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import DashboardProfileForm from '@/components/player/DashboardProfileForm';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, player_id')
    .eq('player_id', user.id)
    .single();

  const role = profile?.role;
  if (role !== 'player' && role !== 'committee') {
    redirect('/unauthorized');
  }

  const metadata = user.user_metadata ?? {};
  const playerId = profile?.player_id;
  const { data: playerRecord } = playerId
    ? await supabase
        .from('player')
        .select('f_name, l_name, handicap')
        .eq('id', playerId)
        .single()
    : { data: null };

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
      <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, color: '#2c3e50' }}>
        Player Dashboard
      </Typography>
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, color: '#2c3e50' }}>
          Account details
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
          Signed in as {user.email}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, color: '#666' }}>
          Player ID: {playerId ?? 'Not linked'}
        </Typography>
        {playerRecord && (
          <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
            Player record: {playerRecord.f_name} {playerRecord.l_name} (HCP {playerRecord.handicap ?? 'N/A'})
          </Typography>
        )}
        {!playerRecord && (
          <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
            Player record: Not linked yet.
          </Typography>
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2c3e50' }}>
          Update your profile
        </Typography>
        <DashboardProfileForm
          preferredName={metadata.preferred_name ?? ''}
          phone={metadata.phone ?? ''}
          handicap={metadata.handicap ?? ''}
        />
      </Paper>
    </Box>
  );
}
