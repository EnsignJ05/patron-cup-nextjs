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
  let boltonBox = {};
  let ensignBox = {};
  let boltonStyle: SxProps<Theme> = { color: '#2c3e50' };
  let ensignStyle: SxProps<Theme> = { color: '#2c3e50' };
  let tieBadge = null;

  if (winner === 'team_bolton') {
    boltonBox = { bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1 };
    boltonStyle = { color: '#2c3e50', fontWeight: 700 };
  } else if (winner === 'team_ensign') {
    ensignBox = { bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1 };
    ensignStyle = { color: '#2c3e50', fontWeight: 700 };
  } else if (winner === 'tie') {
    boltonBox = { bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1 };
    ensignBox = { bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1 };
    boltonStyle = { color: '#2c3e50', fontWeight: 700 };
    ensignStyle = { color: '#2c3e50', fontWeight: 700 };
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
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1, ...boltonBox }}>
        <Typography variant="body2" sx={{ ...boltonStyle, fontWeight: 700 }}>
          Team Bolton
        </Typography>
        {team_bolton.map((p) => (
          <Typography key={p.name} variant="body2" sx={boltonStyle}>{p.name} <span style={{ color: '#666666', fontSize: 12, fontWeight: 500 }}>({p.handicap})</span></Typography>
        ))}
      </Box>
      {/* Tie badge for ties only, between teams */}
      {tieBadge && (
        <Box sx={{ display: { xs: 'block', sm: 'flex' }, alignItems: 'center', justifyContent: 'center', minWidth: 60 }}>{tieBadge}</Box>
      )}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1, ...ensignBox }}>
        <Typography variant="body2" sx={{ ...ensignStyle, fontWeight: 700 }}>
          Team Ensign
        </Typography>
        {team_ensign.map((p) => (
          <Typography key={p.name} variant="body2" sx={ensignStyle}>{p.name} <span style={{ color: '#666666', fontSize: 12, fontWeight: 500 }}>({p.handicap})</span></Typography>
        ))}
      </Box>
    </Box>
  );
} 