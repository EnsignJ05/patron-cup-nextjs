import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: players, error } = await supabase
    .from('branson_roster')
    .select('f_name, l_name, handicap, team');

  const fetchError = error?.message ?? '';
  const roster = players ?? [];

  // Group players by team using joined data
  const thompsonPlayers = roster.filter(p => p.team === 1);
  const berasteguiPlayers = roster.filter(p => p.team === 2);
  const sortByLastName = (list: any[]) =>
    [...list].sort((a, b) => a.l_name.localeCompare(b.l_name));

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
      <Typography
        variant="h3"
        sx={{
          color: '#2c3e50',
          mb: 4,
          fontSize: { xs: '1.75rem', sm: '2.5rem' },
          textAlign: 'center',
        }}
      >
        Admin: Teams (from Database)
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: '#2c3e50',
          mb: 4,
          textAlign: 'center',
          fontWeight: 700,
          fontStyle: 'italic',
          maxWidth: 600,
        }}
      >
        This is a live view of teams from the Supabase database.
      </Typography>
      {fetchError && (
        <Typography color="error" sx={{ mb: 3 }}>
          {fetchError}
        </Typography>
      )}
      {fetchError && <Typography color="error">{fetchError}</Typography>}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 4,
          width: '100%',
          maxWidth: 900,
        }}
      >
        {/* Team Thompson */}
        <Box
          sx={{
            flex: 1,
            bgcolor: '#ffffff',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: '#3498db',
              mb: 3,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontWeight: 700,
            }}
          >
            Team Thompson
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {sortByLastName(thompsonPlayers).map((player, idx) => (
              <Typography
                key={idx}
                variant="body1"
                sx={{
                  color: '#1976d2',
                  py: 0.5,
                  cursor: 'default',
                  textDecoration: 'underline',
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {player.f_name} {player.l_name}
                <span style={{ color: '#666666', fontSize: 14, marginLeft: 8 }}>
                  ({player.handicap})
                </span>
              </Typography>
            ))}
          </Box>
        </Box>
        {/* Team Berastegui */}
        <Box
          sx={{
            flex: 1,
            bgcolor: '#ffffff',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: '#e74c3c',
              mb: 3,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontWeight: 700,
            }}
          >
            Team Berastegui
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {sortByLastName(berasteguiPlayers).map((player, idx) => (
              <Typography
                key={idx}
                variant="body1"
                sx={{
                  color: '#1976d2',
                  py: 0.5,
                  cursor: 'default',
                  textDecoration: 'underline',
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {player.f_name} {player.l_name}
                <span style={{ color: '#666666', fontSize: 14, marginLeft: 8 }}>
                  ({player.handicap})
                </span>
              </Typography>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 