'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Playfair_Display } from 'next/font/google';
import { Inter } from 'next/font/google';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Image from 'next/image';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

const bandonImages = [
  '/gallery/BandonPhotos/tee-times-hero.jpg',
  '/gallery/BandonPhotos/scoreboard-hero.jpg',
  '/gallery/BandonPhotos/gallery-hero.webp',
  '/gallery/BandonPhotos/itinerary-hero.jpg',
  '/gallery/BandonPhotos/hero.jpg',
];

export default function Home() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        color: '#2c3e50',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        textAlign: 'center',
        m: 0,
        p: 0,
        pt: { xs: 8, sm: 12, md: 14 },
        px: { xs: 1, sm: 2, md: 0 },
      }}
    >
      <Box sx={{ maxWidth: 700, width: '100%', px: { xs: 1, sm: 2 }, mb: { xs: 3, sm: 6 } }}>
        <Typography
          variant="h1"
          className={playfair.className}
          sx={{
            fontWeight: 800,
            fontSize: { xs: '2.1rem', sm: '3rem', md: '4.5rem', lg: '5.5rem' },
            lineHeight: 1.08,
            letterSpacing: '-1.5px',
            mb: { xs: 1, sm: 2 },
            wordBreak: 'break-word',
            color: '#2c3e50',
            textShadow: '0 2px 12px rgba(0,0,0,0.1)',
          }}
        >
          Patron Cup 2025
        </Typography>
      </Box>
      <Box sx={{ width: '100%', maxWidth: 900, mb: 6 }}>
        <Slider
          dots
          infinite
          speed={500}
          slidesToShow={1}
          slidesToScroll={1}
          autoplay
          autoplaySpeed={3500}
          arrows={false}
        >
          {bandonImages.map((src, idx) => (
            <Box key={src} sx={{ position: 'relative', width: '100%', height: { xs: 220, sm: 340, md: 420 }, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 5, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
              <Image
                src={src}
                alt={`Bandon Dunes photo ${idx + 1}`}
                fill
                style={{ objectFit: 'cover', borderRadius: 20 }}
                loading="lazy"
                sizes="(max-width: 600px) 100vw, (max-width: 900px) 900px, 1200px"
              />
            </Box>
          ))}
        </Slider>
      </Box>
      <Box sx={{ maxWidth: 700, width: '100%', px: { xs: 1, sm: 2 }, mb: { xs: 3, sm: 6 } }}>
        <Typography
          variant="h3"
          className={inter.className}
          sx={{
            fontWeight: 600,
            fontSize: { xs: '1.1rem', sm: '1.7rem', md: '2.5rem', lg: '3rem' },
            color: '#2c3e50',
            mb: { xs: 1, sm: 2 },
            wordBreak: 'break-word',
          }}
        >
          Bandon Dunes Golf Resort
        </Typography>
        <Typography
          variant="h5"
          className={inter.className}
          sx={{
            fontWeight: 400,
            fontSize: { xs: '0.95rem', sm: '1.2rem', md: '1.5rem' },
            color: '#666666',
            mb: { xs: 2, sm: 4 },
            wordBreak: 'break-word',
          }}
        >
          June 4th – 8th
        </Typography>
      </Box>
    </Box>
  );
}
