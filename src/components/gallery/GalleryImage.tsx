import Image from 'next/image';
import Box from '@mui/material/Box';

interface GalleryImageProps {
  src: string;
  alt: string;
}

export default function GalleryImage({ src, alt }: GalleryImageProps) {
  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        bgcolor: '#181f1b',
        mb: 2,
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={600}
        height={400}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        sizes="(max-width: 600px) 100vw, 50vw"
        placeholder="empty"
      />
    </Box>
  );
} 