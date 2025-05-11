import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function ItineraryPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(to bottom, rgba(34,34,34,0.7) 60%, transparent), url(/itinerary-hero.jpg) center/cover no-repeat',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        pt: { xs: 4, sm: 8 },
      }}
    >
      <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
        Itinerary
      </Typography>
      <Typography variant="h6" sx={{ color: '#b0b0b0' }}>
        This page is coming soon.
      </Typography>
    </Box>
  );
} 