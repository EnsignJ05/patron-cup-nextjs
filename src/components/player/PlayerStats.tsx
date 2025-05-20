'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

interface PlayerStatsProps {
  handicap: number | string;
  record: {
    wins: number;
    losses: number;
    ties: number;
  };
}

export default function PlayerStats({ handicap, record }: PlayerStatsProps) {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      width: '100%',
      mb: 4,
      px: { xs: 1, sm: 2 },
    }}>
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#ffffff',
          borderRadius: 2,
          p: { xs: 2, sm: 3 },
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          display: 'inline-flex',
          width: { xs: '100%', sm: 'auto' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            gap: { xs: 2, sm: 4 },
            width: '100%',
          }}
        >
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography
              variant="subtitle1"
              sx={{
                color: '#666666',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                mb: 0.5,
              }}
            >
              Handicap
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#2c3e50',
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 700,
              }}
            >
              {handicap}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography
              variant="subtitle1"
              sx={{
                color: '#666666',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                mb: 0.5,
              }}
            >
              2025 Record
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#2c3e50',
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 700,
              }}
            >
              {record.wins}-{record.losses}-{record.ties}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
} 