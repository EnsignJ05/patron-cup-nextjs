import { Box, Typography } from '@mui/material';
import GalleryImage from '@/components/gallery/GalleryImage';
import styles from './page.module.css';

// List of image filenames in public/gallery/ExamplePhotos
const imageFilenames = [
  'GolferPuttingExample1.png',
  'GolferPuttingExample2.png',
  'GolferExample1.png',
  'GolferExample2.png',
  'ExampleBandonGroup.png',
];

export default function GalleryPage() {
  return (
    <Box className={styles.container}>
      <Typography variant="h3" className={styles.title}>
        Photo Gallery
      </Typography>
      <Typography variant="h6" className={styles.subtitle}>
        Coming soon - Check back for photos from the 2025 Patron Cup!
      </Typography>
      <Box className={styles.gridContainer}>
        {imageFilenames.map((filename) => (
          <GalleryImage key={filename} src={`/gallery/ExamplePhotos/${filename}`} alt={filename.replace(/([A-Z])/g, ' $1').replace(/\.[^.]+$/, '')} />
        ))}
      </Box>
    </Box>
  );
} 