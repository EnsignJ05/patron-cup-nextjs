import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';

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

const theme = {
  background: '#eef2f7',
  text: '#2c3e50',
};

export default function CourseBox({ name, description, hasTeeTimes, teeTimes }: CourseBoxProps) {
  return (
    <Box 
      sx={{ 
        width: '100%', 
        maxWidth: 800, 
        bgcolor: alpha(theme.background, 0.75),
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        p: 4,
        mb: 3,
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.4)',
      }}
    >
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3,
          color: theme.text,
          fontWeight: 500,
          letterSpacing: '0.5px',
          borderBottom: '2px solid',
          borderColor: alpha(theme.text, 0.15),
          pb: 1,
          display: 'inline-block'
        }}
      >
        {name}
      </Typography>
      {hasTeeTimes && teeTimes ? (
        <TableContainer 
          component={Paper} 
          sx={{ 
            bgcolor: 'transparent',
            boxShadow: 'none',
            '& .MuiTableCell-root': {
              borderColor: alpha(theme.text, 0.08),
              py: 1.5,
              color: theme.text,
            },
            '& .MuiTableHead-root .MuiTableCell-root': {
              bgcolor: alpha(theme.text, 0.02),
              fontWeight: 600,
              color: theme.text,
            },
            '& .MuiTableBody-root .MuiTableRow-root:hover': {
              bgcolor: alpha(theme.text, 0.015),
            }
          }}
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
                  <TableCell sx={{ fontWeight: 500, color: theme.text }}>{teeTime.group}</TableCell>
                  <TableCell>
                    {teeTime.team_bolton.map((player) => (
                      <Box 
                        key={player.name}
                        sx={{ 
                          py: 0.5,
                          '&:not(:last-child)': { mb: 1 },
                          color: theme.text,
                        }}
                      >
                        {player.name}
                      </Box>
                    ))}
                  </TableCell>
                  <TableCell align="center">
                    {teeTime.team_bolton.map((player) => (
                      <Box 
                        key={player.name}
                        sx={{ 
                          py: 0.5,
                          '&:not(:last-child)': { mb: 1 },
                          color: theme.text,
                        }}
                      >
                        {player.handicap}
                      </Box>
                    ))}
                  </TableCell>
                  <TableCell>
                    {teeTime.team_ensign.map((player) => (
                      <Box 
                        key={player.name}
                        sx={{ 
                          py: 0.5,
                          '&:not(:last-child)': { mb: 1 },
                          color: theme.text,
                        }}
                      >
                        {player.name}
                      </Box>
                    ))}
                  </TableCell>
                  <TableCell align="center">
                    {teeTime.team_ensign.map((player) => (
                      <Box 
                        key={player.name}
                        sx={{ 
                          py: 0.5,
                          '&:not(:last-child)': { mb: 1 },
                          color: theme.text,
                        }}
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
          sx={{ 
            fontStyle: 'italic',
            color: alpha(theme.text, 0.7)
          }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
} 