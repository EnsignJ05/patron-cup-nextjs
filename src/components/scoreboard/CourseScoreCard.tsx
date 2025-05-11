import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface CourseScoreCardProps {
  courseName: string;
  date: string;
  teamBoltonTotal?: number;
  teamEnsignTotal?: number;
  children?: React.ReactNode; // For match results or tables
}

export default function CourseScoreCard({ courseName, date, teamBoltonTotal, teamEnsignTotal, children }: CourseScoreCardProps) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 700,
        bgcolor: 'rgba(34,48,43,0.92)',
        borderRadius: 4,
        boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
        p: { xs: 2, sm: 3 },
        mb: 4,
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#3ddad7', fontSize: { xs: 20, sm: 26 } }}>
          {courseName}
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#b0b0b0', fontWeight: 500, fontSize: { xs: 15, sm: 18 } }}>
          {date}
        </Typography>
      </Box>
      {(teamBoltonTotal !== undefined && teamEnsignTotal !== undefined) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ color: '#3ddad7', fontWeight: 700 }}>
            Team Bolton: {teamBoltonTotal}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#b0b0b0', fontWeight: 700 }}>
            |
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#f7b32b', fontWeight: 700 }}>
            Team Ensign: {teamEnsignTotal}
          </Typography>
        </Box>
      )}
      {/* Placeholder for match results or children */}
      {children || (
        <Typography variant="body1" sx={{ color: '#e0e0e0', fontStyle: 'italic' }}>
          Match results coming soon...
        </Typography>
      )}
    </Box>
  );
} 