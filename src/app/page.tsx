import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
// import Button from '@mui/material/Button'; // Removed unused import
import Image from 'next/image';
import { Playfair_Display } from 'next/font/google';
import { Inter } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

export default function Home() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#101614',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        textAlign: 'center',
        m: 0,
        p: 0,
        pt: 14,
      }}
    >
      <Box sx={{ maxWidth: 700, width: '100%', px: 2, mb: 6 }}>
        <Typography
          variant="h1"
          className={playfair.className}
          sx={{
            fontWeight: 800,
            fontSize: { xs: '2.5rem', md: '4.5rem', lg: '5.5rem' },
            lineHeight: 1.05,
            letterSpacing: '-1.5px',
            mb: 2,
          }}
        >
          Patron Cup 2025
        </Typography>
        <Typography
          variant="h3"
          className={inter.className}
          sx={{
            fontWeight: 600,
            fontSize: { xs: '1.5rem', md: '2.5rem', lg: '3rem' },
            color: '#3ddad7',
            mb: 2,
          }}
        >
          Bandon Dunes Golf Resort
        </Typography>
        <Typography
          variant="h5"
          className={inter.className}
          sx={{
            fontWeight: 400,
            fontSize: { xs: '1.1rem', md: '1.5rem' },
            color: '#e0e0e0',
            mb: 4,
          }}
        >
          June 4th – 8th
        </Typography>
      </Box>
      <Box
        sx={{
          width: { xs: '95vw', sm: 600, md: 800 },
          maxWidth: '95vw',
          borderRadius: 5,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          mb: 6,
        }}
      >
        <Image
          src="/hero.jpg"
          alt="Golf course hero"
          width={1200}
          height={600}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          priority
        />
      </Box>
    </Box>
  );
}
