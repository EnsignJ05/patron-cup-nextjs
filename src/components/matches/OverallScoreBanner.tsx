import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { Team } from '@/types/database';
import styles from './OverallScoreBanner.module.css';

type OverallScoreBannerProps = {
  teams: Array<Pick<Team, 'id' | 'name' | 'color'>>;
  totals: Record<string, number>;
};

const formatScore = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(1));

export default function OverallScoreBanner({ teams, totals }: OverallScoreBannerProps) {
  if (teams.length < 2) {
    return (
      <Box className={styles.banner}>
        <Typography variant="h5" className={styles.title}>
          Overall Score
        </Typography>
        <Typography variant="body2" className={styles.helperText}>
          Teams will appear once the event has two teams.
        </Typography>
      </Box>
    );
  }

  const [teamA, teamB] = teams;
  const teamAScore = totals[teamA.id] ?? 0;
  const teamBScore = totals[teamB.id] ?? 0;

  return (
    <Box className={styles.banner}>
      <Typography variant="h5" className={styles.title}>
        Overall Score
      </Typography>
      <Box className={styles.scoreRow}>
        <Box className={styles.teamColumn} style={{ ['--team-color' as string]: teamA.color || undefined }}>
          <Typography variant="subtitle1" className={styles.teamName}>
            {teamA.name}
          </Typography>
          <Typography variant="h3" className={styles.teamScore}>
            {formatScore(teamAScore)}
          </Typography>
        </Box>
        <Typography variant="h4" className={styles.scoreDivider}>
          vs
        </Typography>
        <Box className={styles.teamColumn} style={{ ['--team-color' as string]: teamB.color || undefined }}>
          <Typography variant="subtitle1" className={styles.teamName}>
            {teamB.name}
          </Typography>
          <Typography variant="h3" className={styles.teamScore}>
            {formatScore(teamBScore)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
