import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function ItineraryPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#2c3e50',
        pt: { xs: 4, sm: 8 },
      }}
    >
      <Typography variant="h3" sx={{ mb: 2, fontWeight: 700, color: '#2c3e50' }}>
        Itinerary
      </Typography>
      <Typography variant="h6" sx={{ color: '#666666' }}>
      We&apos;re polishing this up tighter than your buddy&apos;s new &apos;I&apos;m on Ozempic&apos; waistline. Stay tuned, Slim.
      </Typography>
    </Box>
  );
} 