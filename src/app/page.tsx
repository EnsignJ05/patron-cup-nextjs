'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Playfair_Display } from 'next/font/google';
import { Inter } from 'next/font/google';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Image from 'next/image';
import CountdownTimer from '@/components/CountdownTimer';
import styles from './page.module.css';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

const bigCedarImages = [
  '/gallery/BigCedarPhotos/BigCedar.jpg',
  '/gallery/BigCedarPhotos/Cliffhangers.jpg',
  '/gallery/BigCedarPhotos/Ozark.jpg',
  '/gallery/BigCedarPhotos/PV19.jpg',
];

export default function Home() {
  return (
    <Box
      className={styles.root}
    >
      <Box className={styles.titleWrap}>
        <Typography
          variant="h1"
          className={`${playfair.className} ${styles.title}`}
        >
          Patron Cup 2026
        </Typography>
      </Box>
      
      <Box className={styles.timerWrap}>
        <CountdownTimer />
      </Box>

      <Box className={styles.sliderWrap}>
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
          {bigCedarImages.map((src, idx) => (
            <Box key={src} className={styles.slide}>
              <Image
                src={src}
                alt={`Bandon Dunes photo ${idx + 1}`}
                fill
                className={styles.slideImage}
                loading="lazy"
                sizes="(max-width: 600px) 100vw, (max-width: 900px) 900px, 1200px"
              />
            </Box>
          ))}
        </Slider>
      </Box>
      <Box className={styles.locationWrap}>
        <Typography
          variant="h3"
          className={`${inter.className} ${styles.locationTitle}`}
        >
          Big Cedar Lodge
        </Typography>
        <Typography
          variant="h5"
          className={`${inter.className} ${styles.locationDate}`}
        >
          April 22nd – 26th
        </Typography>
      </Box>
    </Box>
  );
}
