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
    <div className={styles.root}>
      <div className={styles.container}>
        <span className={styles.label}>Patron Cup</span>
        <h1 className={styles.displayHeading}>Gallery</h1>
        <p className={styles.subtitle}>Coming soon — check back for photos from the 2025 Patron Cup!</p>
        <div className={styles.gridContainer}>
          {imageFilenames.map((filename) => (
            <GalleryImage
              key={filename}
              src={`/gallery/ExamplePhotos/${filename}`}
              alt={filename.replace(/([A-Z])/g, ' $1').replace(/\.[^.]+$/, '')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
