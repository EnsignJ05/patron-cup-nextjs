import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddToCalendar from '@/components/shared/AddToCalendar';
import styles from './MatchRow.module.css';

interface Player {
  name: string;
  handicap: number | string;
}

interface MatchRowProps {
  match: number;
  group: number;
  time: string;
  date: string;
  team_thompson: Player[];
  team_burgess: Player[];
  winner?: string | null;
  highlightTeam?: 'Thompson' | 'Burgess';
}

export default function MatchRow({ match, group, time, date, team_thompson, team_burgess, winner, highlightTeam }: MatchRowProps) {
  const thompsonBoxClasses = [styles.teamBox];
  const burgessBoxClasses = [styles.teamBox];
  const thompsonTextClasses = [styles.teamText];
  const burgessTextClasses = [styles.teamText];
  let tieBadge = null;

  // Parse date and time for calendar
  const [month, day, year] = date.split('/');
  const [hours, minutes] = time.split(':');
  const ampm = time.split(' ')[1];
  const hour = ampm === 'PM' ? parseInt(hours) + 12 : parseInt(hours);
  
  const startDate = new Date(parseInt(`20${year}`), parseInt(month) - 1, parseInt(day), hour, parseInt(minutes));
  const endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000)); // 4 hours duration

  // Create player lists for description
  const thompsonPlayers = team_thompson.map(p => `${p.name} (HC: ${p.handicap})`).join(', ');
  const burgessPlayers = team_burgess.map(p => `${p.name} (HC: ${p.handicap})`).join(', ');
  const description = `Match ${match} - Group ${group}\nTeam Thompson: ${thompsonPlayers}\nTeam Burgess: ${burgessPlayers}`;

  if (winner === 'team_thompson') {
    thompsonBoxClasses.push(styles.teamBoxWinnerThompson);
    thompsonTextClasses.push(styles.teamTextWinnerThompson);
  } else if (winner === 'team_burgess') {
    burgessBoxClasses.push(styles.teamBoxWinnerBurgess);
    burgessTextClasses.push(styles.teamTextWinnerBurgess);
  } else if (winner === 'tie') {
    thompsonBoxClasses.push(styles.teamBoxTie);
    burgessBoxClasses.push(styles.teamBoxTie);
    thompsonTextClasses.push(styles.teamTextTie);
    burgessTextClasses.push(styles.teamTextTie);
    tieBadge = (
      <Box className={styles.tieBadge}>
        TIE
      </Box>
    );
  }

  // Apply highlight styles for the player's team
  if (highlightTeam === 'Thompson') {
    thompsonBoxClasses.push(styles.teamBoxHighlightThompson);
  } else if (highlightTeam === 'Burgess') {
    burgessBoxClasses.push(styles.teamBoxHighlightBurgess);
  }

  return (
    <Box
      className={styles.row}
    >
      <Box className={styles.matchInfo}>
        <Typography variant="subtitle2" className={styles.matchLabel}>
          Match {match}
        </Typography>
      </Box>
      <Box className={styles.groupInfo}>
        <Typography variant="subtitle2" className={styles.groupLabel}>
          Group {group}
        </Typography>
        <Typography variant="body2" className={styles.groupTime}>{time}</Typography>
      </Box>
      <Box className={thompsonBoxClasses.join(' ')}>
        <Typography variant="body2" className={`${styles.teamLabel} ${thompsonTextClasses.join(' ')}`}>
          Team Thompson
        </Typography>
        {team_thompson.map((p) => (
          <Typography key={p.name} variant="body2" className={thompsonTextClasses.join(' ')}>
            {p.name} <span className={styles.handicap}>({p.handicap})</span>
          </Typography>
        ))}
      </Box>
      {/* Tie badge for ties only, between teams */}
      {tieBadge && (
        <Box className={styles.tieBadgeWrap}>{tieBadge}</Box>
      )}
      <Box className={burgessBoxClasses.join(' ')}>
        <Typography variant="body2" className={`${styles.teamLabel} ${burgessTextClasses.join(' ')}`}>
          Team Burgess
        </Typography>
        {team_burgess.map((p) => (
          <Typography key={p.name} variant="body2" className={burgessTextClasses.join(' ')}>
            {p.name} <span className={styles.handicap}>({p.handicap})</span>
          </Typography>
        ))}
      </Box>
      {/* Calendar Column - only show for upcoming matches */}
      {winner === null && (
        <Box className={styles.calendarColumn}>
          <AddToCalendar
            title={`Golf Match ${match} - Group ${group}`}
            description={description}
            startDate={startDate}
            endDate={endDate}
            location="Bandon Dunes Golf Resort"
          />
        </Box>
      )}
    </Box>
  );
} 