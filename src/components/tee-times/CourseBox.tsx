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
  background: '#ffffff',
  text: '#2c3e50',
  border: 'rgba(0,0,0,0.12)',
  hover: 'rgba(0,0,0,0.04)',
  shadow: '0 8px 32px rgba(0,0,0,0.12)',
  hoverShadow: '0 12px 48px rgba(0,0,0,0.15)',
};

export default function CourseBox({ name, description, hasTeeTimes, teeTimes }: CourseBoxProps) {
  return (
    <Box 
      sx={{ 
        width: '100%', 
        maxWidth: 800, 
        bgcolor: theme.background,
        borderRadius: 3,
        boxShadow: theme.shadow,
        p: 4,
        mb: 3,
        border: `1px solid ${theme.border}`,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.hoverShadow,
        },
      }}
    >
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3,
          color: theme.text,
          fontWeight: 600,
          letterSpacing: '0.5px',
          borderBottom: '2px solid',
          borderColor: theme.border,
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
              borderColor: theme.border,
              py: 1.5,
              color: theme.text,
            },
            '& .MuiTableHead-root .MuiTableCell-root': {
              bgcolor: theme.hover,
              fontWeight: 600,
              color: theme.text,
            },
            '& .MuiTableBody-root .MuiTableRow-root:hover': {
              bgcolor: theme.hover,
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