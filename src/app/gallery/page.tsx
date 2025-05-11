import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        color: '#2c3e50',
        pt: { xs: 4, sm: 8 },
        px: { xs: 1, sm: 2 },
      }}
    >
      <Typography variant="h3" sx={{ mb: { xs: 2, sm: 4 }, fontWeight: 700, fontSize: { xs: '2rem', sm: '2.5rem' }, color: '#2c3e50' }}>
        Gallery
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: { xs: 2, sm: 4 },
          width: '100%',
          maxWidth: 900,
          px: 0,
        }}
      >
        {imageFilenames.map((filename) => (
          <GalleryImage key={filename} src={`/gallery/ExamplePhotos/${filename}`} alt={filename.replace(/([A-Z])/g, ' $1').replace(/\.[^.]+$/, '')} />
        ))}
      </Box>
    </Box>
  );
} 