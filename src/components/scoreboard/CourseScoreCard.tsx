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
        bgcolor: '#ffffff',
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        p: { xs: 2, sm: 3 },
        mb: 4,
        color: '#2c3e50',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        border: '1px solid rgba(0,0,0,0.12)',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#2c3e50', fontSize: { xs: 20, sm: 26 } }}>
          {courseName}
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#666666', fontWeight: 600, fontSize: { xs: 15, sm: 18 } }}>
          {date}
        </Typography>
      </Box>
      {(teamBoltonTotal !== undefined && teamEnsignTotal !== undefined) && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 3, 
          mb: 1,
          py: 1,
          px: 2,
          bgcolor: 'rgba(0,0,0,0.02)',
          borderRadius: 2,
        }}>
          <Typography variant="subtitle1" sx={{ color: '#2c3e50', fontWeight: 700 }}>
            Team Bolton: {teamBoltonTotal}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#666666', fontWeight: 700 }}>
            |
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#2c3e50', fontWeight: 700 }}>
            Team Ensign: {teamEnsignTotal}
          </Typography>
        </Box>
      )}
      {/* Placeholder for match results or children */}
      {children || (
        <Typography variant="body1" sx={{ color: '#666666', fontStyle: 'italic' }}>
          Match results coming soon...
        </Typography>
      )}
    </Box>
  );
} 