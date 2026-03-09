'use client';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { getPlayerRerounds } from '@/utils/playerUtils';
import type { Reround } from '@/utils/playerUtils';
import styles from './PlayerRerounds.module.css';

export interface PlayerReroundsProps {
  playerName: string;
}

export default function PlayerRerounds({ playerName }: PlayerReroundsProps) {
  const rerounds = getPlayerRerounds(playerName);

  if (rerounds.length === 0) {
    return (
      <Box className={styles.container}>
        <Typography 
          variant="h4" 
          className={styles.title}
        >
          Additional Rounds
        </Typography>
        <Box 
          className={styles.emptyCard}
        >
          <Typography 
            variant="body1" 
            className={styles.emptyText}
          >
            No additional rounds found
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className={styles.container}>
      <Typography 
        variant="h4" 
        className={styles.title}
      >
        Additional Rounds
      </Typography>
      <Box 
        className={styles.list}
      >
        {rerounds.map((reround: Reround) => {
          // Parse date and time for calendar
          const [month, day, year] = reround.date.split('/');
          // const [hours, minutes] = reround.time.split(':');
          // const ampm = reround.time.split(' ')[1];
          // const hour = ampm === 'PM' ? parseInt(hours) + 12 : parseInt(hours);
          
          // const startDate = new Date(parseInt(`20${year}`), parseInt(month) - 1, parseInt(day), hour, parseInt(minutes));
          // const endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000)); // 4 hours duration

          // Format date for display
          const displayDate = new Date(parseInt(`20${year}`), parseInt(month) - 1, parseInt(day));
          const formattedDate = displayDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <Card key={`${reround.date}-${reround.time}`} className={styles.reroundCard}>
              <CardContent className={styles.reroundContent}>
                <Box>
                  <Typography variant="subtitle1" className={styles.reroundTitle}>
                    {formattedDate}
                  </Typography>
                  <Typography variant="body2" className={styles.reroundMeta}>
                    {reround.time}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" className={styles.reroundTitle}>
                    {reround.course}
                  </Typography>
                  {reround.group && (
                    <Typography variant="body2" className={styles.reroundGroup}>
                      Group {reround.group}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
} 