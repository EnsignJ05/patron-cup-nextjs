import Button from '@mui/material/Button';
import Link from 'next/link';
import styles from './page.module.css';

export default function UnauthorizedPage() {
  return (
    <div className={styles.pageRoot}>
      <div className={styles.card}>
        <h1 className={styles.title}>Access denied</h1>
        <p className={styles.subtitle}>You do not have permission to view this page.</p>
        <Button component={Link} href="/" variant="contained">
          Go home
        </Button>
      </div>
    </div>
  );
}
