import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface Player {
  name: string;
  handicap: number;
}

interface MatchRowProps {
  match: number;
  group: number;
  time: string;
  team_bolton: Player[];
  team_ensign: Player[];
  winner?: string | null;
}

export default function MatchRow({ match, group, time, team_bolton, team_ensign, winner }: MatchRowProps) {
  let winnerDisplay = null;
  let winnerColor = '';
  let rowBg = 'transparent';
  let boltonStyle = {};
  let ensignStyle = {};

  if (winner === 'team_bolton') {
    winnerDisplay = 'Winner: Team Bolton';
    winnerColor = '#3ddad7';
    rowBg = 'rgba(61,218,215,0.10)';
    boltonStyle = { fontWeight: 700, fontSize: 16, color: '#3ddad7' };
    ensignStyle = { fontWeight: 400, fontSize: 14, color: '#b0b0b0' };
  } else if (winner === 'team_ensign') {
    winnerDisplay = 'Winner: Team Ensign';
    winnerColor = '#f7b32b';
    rowBg = 'rgba(247,179,43,0.10)';
    boltonStyle = { fontWeight: 400, fontSize: 14, color: '#b0b0b0' };
    ensignStyle = { fontWeight: 700, fontSize: 16, color: '#f7b32b' };
  } else if (winner === 'tie') {
    winnerDisplay = 'Result: Tie';
    winnerColor = '#b0b0b0';
    rowBg = 'rgba(176,176,176,0.10)';
    boltonStyle = { fontWeight: 500, fontSize: 15, color: 'white' };
    ensignStyle = { fontWeight: 500, fontSize: 15, color: 'white' };
  } else {
    boltonStyle = { fontWeight: 500, fontSize: 15, color: 'white' };
    ensignStyle = { fontWeight: 500, fontSize: 15, color: 'white' };
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
        borderBottom: '1px solid #22302b',
        bgcolor: rowBg,
      }}
    >
      <Box sx={{ minWidth: 60, textAlign: 'center' }}>
        <Typography variant="subtitle2" sx={{ color: '#3ddad7', fontWeight: 700 }}>
          Match {match}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 80, textAlign: 'center' }}>
        <Typography variant="subtitle2" sx={{ color: '#b0b0b0', fontWeight: 500 }}>
          Group {group}
        </Typography>
        <Typography variant="body2" sx={{ color: '#e0e0e0' }}>{time}</Typography>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="body2" sx={boltonStyle as any}>
          Team Bolton
        </Typography>
        {team_bolton.map((p) => (
          <Typography key={p.name} variant="body2" sx={boltonStyle as any}>{p.name} <span style={{ color: '#b0b0b0', fontSize: 12 }}>({p.handicap})</span></Typography>
        ))}
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="body2" sx={ensignStyle as any}>
          Team Ensign
        </Typography>
        {team_ensign.map((p) => (
          <Typography key={p.name} variant="body2" sx={ensignStyle as any}>{p.name} <span style={{ color: '#b0b0b0', fontSize: 12 }}>({p.handicap})</span></Typography>
        ))}
      </Box>
      <Box sx={{ width: 180, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {winnerDisplay ? (
          <Typography variant="caption" sx={{ color: winnerColor, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {winnerDisplay}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
} 