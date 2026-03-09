import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import styles from './CourseBox.module.css';

interface Player {
  name: string;
  handicap: number;
}

interface TeeTime {
  group: string;
  team_bolton: Player[];
  team_ensign: Player[];
}

interface CourseBoxProps {
  name: string;
  description: string;
  hasTeeTimes: boolean;
  teeTimes?: TeeTime[];
}

export default function CourseBox({ name, description, hasTeeTimes, teeTimes }: CourseBoxProps) {
  return (
    <Box className={styles.courseCard}>
      <Typography 
        variant="h5" 
        className={styles.courseTitle}
      >
        {name}
      </Typography>
      {hasTeeTimes && teeTimes ? (
        <TableContainer 
          component={Paper} 
          className={styles.tableContainer}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Team Bolton</TableCell>
                <TableCell align="center">Handicap</TableCell>
                <TableCell>Team Ensign</TableCell>
                <TableCell align="center">Handicap</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teeTimes.map((teeTime) => (
                <TableRow key={teeTime.group}>
                  <TableCell className={styles.timeCell}>{teeTime.group}</TableCell>
                  <TableCell>
                    {teeTime.team_bolton.map((player) => (
                      <Box 
                        key={player.name}
                        className={styles.playerEntry}
                      >
                        {player.name}
                      </Box>
                    ))}
                  </TableCell>
                  <TableCell align="center">
                    {teeTime.team_bolton.map((player) => (
                      <Box 
                        key={player.name}
                        className={styles.playerEntry}
                      >
                        {player.handicap}
                      </Box>
                    ))}
                  </TableCell>
                  <TableCell>
                    {teeTime.team_ensign.map((player) => (
                      <Box 
                        key={player.name}
                        className={styles.playerEntry}
                      >
                        {player.name}
                      </Box>
                    ))}
                  </TableCell>
                  <TableCell align="center">
                    {teeTime.team_ensign.map((player) => (
                      <Box 
                        key={player.name}
                        className={styles.playerEntry}
                      >
                        {player.handicap}
                      </Box>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography 
          variant="body1" 
          className={styles.courseDescription}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
} 