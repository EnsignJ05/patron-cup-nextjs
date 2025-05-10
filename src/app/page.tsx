import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

const fontFamily = `'Cormorant Garamond', serif`;

export default function Home() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(to bottom, rgba(34,34,34,0.7) 60%, transparent), url(/hero.jpg) center/cover no-repeat',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        m: 0,
        p: 0,
        fontFamily,
      }}
    >
      <Typography variant="h2" sx={{ fontWeight: 700, mb: 2, fontFamily }}>
        Golf as it was meant to be
      </Typography>
      <Typography variant="h5" sx={{ mb: 4, fontFamily }}>
        Seven distinct links courses conceived in harmony with the natural environment.
      </Typography>
      <Button variant="contained" color="primary" size="large" href="/tee-times" sx={{ fontFamily }}>
        Plan My Trip
      </Button>
    </Box>
  );
}
