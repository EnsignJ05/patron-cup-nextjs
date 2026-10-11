import Image from 'next/image';
import styles from './GalleryImage.module.css';

interface GalleryImageProps {
  src: string;
  alt: string;
}

export default function GalleryImage({ src, alt }: GalleryImageProps) {
  return (
    <div className={styles.imageCard}>
      <Image
        src={src}
        alt={alt}
        width={600}
        height={400}
        className={styles.image}
        sizes="(max-width: 600px) 100vw, 50vw"
        placeholder="empty"
      />
    </div>
  );
} 