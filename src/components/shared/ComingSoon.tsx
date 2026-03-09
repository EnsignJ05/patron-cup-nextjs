import { Box, Typography } from '@mui/material';
import styles from './ComingSoon.module.css';

interface ComingSoonProps {
  message: string;
}

export default function ComingSoon({ message }: ComingSoonProps) {
  return (
    <Box className={styles.card}>
      <Typography
        variant="h4"
        className={styles.title}
      >
        Coming Soon
      </Typography>
      <Typography
        variant="body1"
        className={styles.message}
      >
        {message}
      </Typography>
    </Box>
  );
} 