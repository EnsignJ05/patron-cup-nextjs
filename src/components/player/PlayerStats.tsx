'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import styles from './PlayerStats.module.css';

interface PlayerStatsProps {
  handicap: number | string;
  record: {
    wins: number;
    losses: number;
    ties: number;
  };
}

export default function PlayerStats({ handicap, record }: PlayerStatsProps) {
  return (
    <Box className={styles.statsRoot}>
      <Paper
        elevation={0}
        className={styles.statsCard}
      >
        <Box className={styles.statsContent}>
          <Box className={styles.statBlock}>
            <Typography
              variant="subtitle1"
              className={styles.statLabel}
            >
              Handicap
            </Typography>
            <Typography
              variant="h6"
              className={styles.statValue}
            >
              {handicap}
            </Typography>
          </Box>

          <Box className={styles.statBlock}>
            <Typography
              variant="subtitle1"
              className={styles.statLabel}
            >
              2025 Record
            </Typography>
            <Typography
              variant="h6"
              className={styles.statValue}
            >
              {record.wins}-{record.losses}-{record.ties}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
} 