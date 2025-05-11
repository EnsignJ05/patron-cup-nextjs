import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function ScoreboardPage() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
        Scoreboard
      </Typography>
      <Typography variant="h6" sx={{ color: '#b0b0b0' }}>
        This page is coming soon.
      </Typography>
    </Box>
  );
} 