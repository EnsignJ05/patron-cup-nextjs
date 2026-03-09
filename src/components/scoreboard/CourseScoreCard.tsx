import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import styles from './CourseScoreCard.module.css';

interface CourseScoreCardProps {
  courseName: string;
  date: string;
  teamThompsonTotal?: number;
  teamBurgessTotal?: number;
  children?: React.ReactNode; // For match results or tables
}

export default function CourseScoreCard({ courseName, date, teamThompsonTotal, teamBurgessTotal, children }: CourseScoreCardProps) {
  return (
    <Box className={styles.card}>
      <Box className={styles.header}>
        <Typography variant="h5" className={styles.title}>
          {courseName}
        </Typography>
        <Typography variant="subtitle1" className={styles.subtitle}>
          {date}
        </Typography>
      </Box>
      {(teamThompsonTotal !== undefined && teamBurgessTotal !== undefined) && (
        <Box className={styles.totals}>
          <Typography variant="subtitle1" className={styles.totalThompson}>
            Team Thompson: {teamThompsonTotal}
          </Typography>
          <Typography variant="subtitle1" className={styles.totalDivider}>
            |
          </Typography>
          <Typography variant="subtitle1" className={styles.totalBurgess}>
            Team Burgess: {teamBurgessTotal}
          </Typography>
        </Box>
      )}
      {/* Placeholder for match results or children */}
      {children || (
        <Typography variant="body1" className={styles.placeholder}>
          Match results coming soon...
        </Typography>
      )}
    </Box>
  );
} 