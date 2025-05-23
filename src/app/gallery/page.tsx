import { Box, Typography } from '@mui/material';
import { styles } from '@/styles/pages/gallery/styles';
import GalleryImage from '@/components/gallery/GalleryImage';

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
    <Box sx={styles.container}>
      <Typography variant="h3" sx={styles.title}>
        Photo Gallery
      </Typography>
      <Typography variant="h6" sx={styles.subtitle}>
        Coming soon - Check back for photos from the 2025 Patron Cup!
      </Typography>
      <Box sx={styles.gridContainer}>
        {imageFilenames.map((filename) => (
          <GalleryImage key={filename} src={`/gallery/ExamplePhotos/${filename}`} alt={filename.replace(/([A-Z])/g, ' $1').replace(/\.[^.]+$/, '')} />
        ))}
      </Box>
    </Box>
  );
} 