import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CourseScoreCard from '@/components/scoreboard/CourseScoreCard';

// Example overall scores
const teamBoltonScore = 12;
const teamEnsignScore = 10;

// Example courses
const courses = [
  { name: 'Bandon Dunes', date: 'June 4, 2025' },
  { name: 'Pacific Dunes', date: 'June 5, 2025' },
  { name: 'Old Macdonald', date: 'June 6, 2025' },
];

export default function ScoreboardPage() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', color: 'white', pt: { xs: 4, sm: 8 } }}>
      {/* Scoreboard Heading */}
      <Typography variant="h3" sx={{ mb: { xs: 2, sm: 4 }, fontWeight: 700 }}>
        Scoreboard
      </Typography>
      {/* Overall Score Display */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 2, sm: 6, md: 10 },
          mb: { xs: 4, sm: 6 },
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: 'rgba(34,48,43,0.85)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
          width: '100%',
          maxWidth: 700,
          minHeight: 120,
        }}
      >
        {/* Team Bolton */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#3ddad7', fontSize: { xs: 18, sm: 24 } }}>
            Team Bolton
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color: 'white', mt: 0.5 }}>
            {teamBoltonScore}
          </Typography>
        </Box>
        {/* Separator */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#b0b0b0', mt: 2 }}>
            :
          </Typography>
        </Box>
        {/* Team Ensign */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#f7b32b', fontSize: { xs: 18, sm: 24 } }}>
            Team Ensign
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color: 'white', mt: 0.5 }}>
            {teamEnsignScore}
          </Typography>
        </Box>
      </Box>
      {/* Course Score Cards */}
      {courses.map((course) => (
        <CourseScoreCard key={course.name} courseName={course.name} date={course.date} />
      ))}
    </Box>
  );
} 