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

  // Get player record (which contains the role)
  const { data: playerRecord, error: playerError } = await supabase
    .from('players')
    .select('id, first_name, last_name, current_handicap, email, phone, role')
    .eq('auth_user_id', user.id)
    .single();

  console.log('Dashboard page query:', {
    userId: user.id,
    email: user.email,
    playerRecord,
    playerError
  });

  const role = playerRecord?.role;
  if (!role || (role !== 'player' && role !== 'committee' && role !== 'admin')) {
    console.log('Redirecting to unauthorized - role check failed:', { role });
    redirect('/unauthorized');
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
        {playerRecord && (
          <>
            <Typography variant="body2" sx={{ mb: 1, color: '#666' }}>
              Name: {playerRecord.first_name} {playerRecord.last_name}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, color: '#666' }}>
              Role: {playerRecord.role}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
              Handicap: {playerRecord.current_handicap ?? 'Not set'}
            </Typography>
          </>
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
          playerId={playerRecord?.id ?? ''}
          firstName={playerRecord?.first_name ?? ''}
          lastName={playerRecord?.last_name ?? ''}
          phone={playerRecord?.phone ?? ''}
          handicap={playerRecord?.current_handicap?.toString() ?? ''}
        />
      </Paper>
    </Box>
  );
}
