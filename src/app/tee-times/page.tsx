import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CourseBox from '@/components/tee-times/CourseBox';
import coursesData from '@/data/courses.json';
import teeTimesData from '@/data/tee-times.json';

export default function TeeTimesPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(to bottom, rgba(34,34,34,0.7) 60%, transparent), url(/tee-times-hero.jpg) center/cover no-repeat',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        py: 8,
      }}
    >
      <Typography variant="h3" gutterBottom sx={{ color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
        Tee Times
      </Typography>
      {coursesData.courses.map((course) => (
        <CourseBox
          key={course.id}
          name={course.name}
          description={course.description}
          hasTeeTimes={course.hasTeeTimes}
          teeTimes={course.hasTeeTimes ? teeTimesData[course.id as keyof typeof teeTimesData] : undefined}
        />
      ))}
    </Box>
  );
} 