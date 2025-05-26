import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface CourseScoreCardProps {
  courseName: string;
  date: string;
  teamThompsonTotal?: number;
  teamBurgessTotal?: number;
  children?: React.ReactNode; // For match results or tables
}

export default function CourseScoreCard({ courseName, date, teamThompsonTotal, teamBurgessTotal, children }: CourseScoreCardProps) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: 370, sm: 900 },
        bgcolor: '#ffffff',
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        p: { xs: 1.5, sm: 3 },
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
      <Box sx={{ mb: 1, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#2c3e50', fontSize: { xs: 20, sm: 26 }, textAlign: 'center' }}>
          {courseName}
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#666666', fontWeight: 600, fontSize: { xs: 15, sm: 18 }, textAlign: 'center' }}>
          {date}
        </Typography>
      </Box>
      {(teamThompsonTotal !== undefined && teamBurgessTotal !== undefined) && (
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
          <Typography variant="subtitle1" sx={{ color: '#3498db', fontWeight: 700, fontSize: { xs: '0.8rem', sm: '1rem' } }}>
            Team Thompson: {teamThompsonTotal}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#666666', fontWeight: 700, fontSize: { xs: '0.8rem', sm: '1rem' } }}>
            |
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#e74c3c', fontWeight: 700, fontSize: { xs: '0.8rem', sm: '1rem' } }}>
            Team Burgess: {teamBurgessTotal}
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