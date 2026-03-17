import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from 'next/link';
import styles from './page.module.css';

export default function UnauthorizedPage() {
  return (
    <Box className={styles.pageRoot}>
      <Typography variant="h4" className={styles.title}>
        Access denied
      </Typography>
      <Typography variant="body1" className={styles.subtitle}>
        You do not have permission to view this page.
      </Typography>
      <Button component={Link} href="/" variant="contained">
        Go home
      </Button>
    </Box>
  );
}
