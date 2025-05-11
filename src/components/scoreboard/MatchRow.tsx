import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { SxProps, Theme } from '@mui/material/styles';

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
  let rowBg = 'transparent';
  let boltonStyle: SxProps<Theme> = {};
  let ensignStyle: SxProps<Theme> = {};
  let boltonBox = {};
  let ensignBox = {};
  let tieBadge = null;

  if (winner === 'team_bolton') {
    rowBg = 'rgba(61,218,215,0.10)';
    boltonStyle = { fontWeight: 700, fontSize: 16, color: '#3ddad7' };
    ensignStyle = { fontWeight: 400, fontSize: 14, color: '#b0b0b0' };
    boltonBox = { border: '2px solid #3ddad7', borderRadius: 3, boxShadow: '0 0 8px #3ddad733' };
  } else if (winner === 'team_ensign') {
    rowBg = 'rgba(247,179,43,0.10)';
    boltonStyle = { fontWeight: 400, fontSize: 14, color: '#b0b0b0' };
    ensignStyle = { fontWeight: 700, fontSize: 16, color: '#f7b32b' };
    ensignBox = { border: '2px solid #f7b32b', borderRadius: 3, boxShadow: '0 0 8px #f7b32b33' };
  } else if (winner === 'tie') {
    rowBg = 'rgba(176,176,176,0.10)';
    boltonStyle = { fontWeight: 500, fontSize: 15, color: 'white' };
    ensignStyle = { fontWeight: 500, fontSize: 15, color: 'white' };
    boltonBox = { border: '2px solid #b0b0b0', borderRadius: 3 };
    ensignBox = { border: '2px solid #b0b0b0', borderRadius: 3 };
    tieBadge = (
      <Box sx={{ px: 2, py: 0.5, bgcolor: '#b0b0b0', color: '#222', borderRadius: 2, fontWeight: 700, fontSize: 13, alignSelf: 'center', my: { xs: 1, sm: 0 } }}>
        Tie
      </Box>
    );
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
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1, ...boltonBox }}>
        <Typography variant="body2" sx={boltonStyle}>
          Team Bolton
        </Typography>
        {team_bolton.map((p) => (
          <Typography key={p.name} variant="body2" sx={boltonStyle}>{p.name} <span style={{ color: '#b0b0b0', fontSize: 12 }}>({p.handicap})</span></Typography>
        ))}
      </Box>
      {/* Tie badge for ties only, between teams */}
      {tieBadge && (
        <Box sx={{ display: { xs: 'block', sm: 'flex' }, alignItems: 'center', justifyContent: 'center', minWidth: 60 }}>{tieBadge}</Box>
      )}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1, ...ensignBox }}>
        <Typography variant="body2" sx={ensignStyle}>
          Team Ensign
        </Typography>
        {team_ensign.map((p) => (
          <Typography key={p.name} variant="body2" sx={ensignStyle}>{p.name} <span style={{ color: '#b0b0b0', fontSize: 12 }}>({p.handicap})</span></Typography>
        ))}
      </Box>
    </Box>
  );
} 