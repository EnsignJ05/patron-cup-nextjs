import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { SxProps, Theme } from '@mui/material/styles';
import AddToCalendar from '@/components/shared/AddToCalendar';

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
}

export default function MatchRow({ match, group, time, date, team_thompson, team_burgess, winner }: MatchRowProps) {
  const rowBg = 'transparent';
  let thompsonBox = {};
  let burgessBox = {};
  let thompsonStyle: SxProps<Theme> = { color: '#2c3e50' };
  let burgessStyle: SxProps<Theme> = { color: '#2c3e50' };
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
    thompsonBox = { bgcolor: 'rgba(52, 152, 219, 0.1)', borderRadius: 1 };
    thompsonStyle = { color: '#3498db', fontWeight: 700 };
  } else if (winner === 'team_burgess') {
    burgessBox = { bgcolor: 'rgba(231, 76, 60, 0.1)', borderRadius: 1 };
    burgessStyle = { color: '#e74c3c', fontWeight: 700 };
  } else if (winner === 'tie') {
    thompsonBox = { bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1 };
    burgessBox = { bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1 };
    thompsonStyle = { color: '#2c3e50', fontWeight: 700 };
    burgessStyle = { color: '#2c3e50', fontWeight: 700 };
    tieBadge = (
      <Box sx={{ 
        bgcolor: 'rgba(0,0,0,0.06)', 
        color: '#2c3e50',
        px: 1.5, 
        py: 0.5, 
        borderRadius: 1,
        fontSize: 12,
        fontWeight: 700,
      }}>
        TIE
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        py: 1.5,
        px: 1,
        borderBottom: '1px solid rgba(0,0,0,0.12)',
        bgcolor: rowBg,
        '&:hover': {
          bgcolor: 'rgba(0,0,0,0.02)',
        },
      }}
    >
      <Box sx={{ minWidth: 60, textAlign: 'center' }}>
        <Typography variant="subtitle2" sx={{ color: '#2c3e50', fontWeight: 800 }}>
          Match {match}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 80, textAlign: 'center' }}>
        <Typography variant="subtitle2" sx={{ color: '#666666', fontWeight: 600 }}>
          Group {group}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666', fontWeight: 500 }}>{time}</Typography>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1, ...thompsonBox }}>
        <Typography variant="body2" sx={{ ...thompsonStyle, fontWeight: 700 }}>
          Team Thompson
        </Typography>
        {team_thompson.map((p) => (
          <Typography key={p.name} variant="body2" sx={thompsonStyle}>{p.name} <span style={{ color: '#666666', fontSize: 12, fontWeight: 500 }}>({p.handicap})</span></Typography>
        ))}
      </Box>
      {/* Tie badge for ties only, between teams */}
      {tieBadge && (
        <Box sx={{ display: { xs: 'block', sm: 'flex' }, alignItems: 'center', justifyContent: 'center', minWidth: 60 }}>{tieBadge}</Box>
      )}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1, ...burgessBox }}>
        <Typography variant="body2" sx={{ ...burgessStyle, fontWeight: 700 }}>
          Team Burgess
        </Typography>
        {team_burgess.map((p) => (
          <Typography key={p.name} variant="body2" sx={burgessStyle}>{p.name} <span style={{ color: '#666666', fontSize: 12, fontWeight: 500 }}>({p.handicap})</span></Typography>
        ))}
      </Box>
      {/* Calendar Column - only show for upcoming matches */}
      {winner === null && (
        <Box 
          sx={{ 
            minWidth: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 1,
            borderLeft: { xs: 'none', sm: '1px solid rgba(0,0,0,0.08)' }
          }}
        >
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