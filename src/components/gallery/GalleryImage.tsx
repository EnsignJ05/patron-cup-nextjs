import Image from 'next/image';
import Box from '@mui/material/Box';
import styles from './GalleryImage.module.css';

interface GalleryImageProps {
  src: string;
  alt: string;
}

export default function GalleryImage({ src, alt }: GalleryImageProps) {
  return (
    <Box className={styles.imageCard}>
      <Image
        src={src}
        alt={alt}
        width={600}
        height={400}
        className={styles.image}
        sizes="(max-width: 600px) 100vw, 50vw"
        placeholder="empty"
      />
    </Box>
  );
} 