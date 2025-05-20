'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AddToCalendar from '@/components/shared/AddToCalendar';

interface Reround {
  course: string;
  date: string;
  time: string;
  group?: number;
}

interface PlayerReroundsProps {
  rerounds: Reround[];
}

export default function PlayerRerounds({ rerounds }: PlayerReroundsProps) {
  if (!rerounds || rerounds.length === 0) {
    return (
      <Box sx={{ width: '100%', maxWidth: 900, px: { xs: 2, sm: 3 } }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: '#2c3e50',
            mb: 3,
            fontSize: { xs: '1.5rem', sm: '2rem' },
            textAlign: 'center',
          }}
        >
          Additional Rounds
        </Typography>
        <Box 
          sx={{ 
            bgcolor: '#ffffff',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#95a5a6',
              fontSize: { xs: '1rem', sm: '1.125rem' },
            }}
          >
            No additional rounds found
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 900, px: { xs: 2, sm: 3 } }}>
      <Typography 
        variant="h4" 
        sx={{ 
          color: '#2c3e50',
          mb: 3,
          fontSize: { xs: '1.5rem', sm: '2rem' },
          textAlign: 'center',
        }}
      >
        Additional Rounds
      </Typography>
      <Box 
        sx={{ 
          bgcolor: '#ffffff',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}
      >
        {rerounds.map((reround, index) => {
          // Parse date and time for calendar
          const [month, day, year] = reround.date.split('/');
          const [hours, minutes] = reround.time.split(':');
          const ampm = reround.time.split(' ')[1];
          const hour = ampm === 'PM' ? parseInt(hours) + 12 : parseInt(hours);
          
          const startDate = new Date(parseInt(`20${year}`), parseInt(month) - 1, parseInt(day), hour, parseInt(minutes));
          const endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000)); // 4 hours duration

          // Format date for display
          const displayDate = new Date(parseInt(`20${year}`), parseInt(month) - 1, parseInt(day));
          const formattedDate = displayDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <Box
              key={`${reround.course}-${reround.date}-${reround.time}`}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                gap: 2,
                py: 2,
                px: 3,
                borderBottom: index < rerounds.length - 1 ? '1px solid rgba(0,0,0,0.12)' : 'none',
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.02)',
                },
              }}
            >
              <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#2c3e50',
                    fontSize: { xs: '1.125rem', sm: '1.25rem' },
                    fontWeight: 700,
                    mb: 0.5,
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
                >
                  {reround.course}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#666666',
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    mb: 0.5,
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
                >
                  {formattedDate}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#666666',
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
                >
                  {reround.group !== undefined ? `Group ${reround.group} • ` : ''}{reround.time}
                </Typography>
              </Box>
              <Box 
                sx={{ 
                  minWidth: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AddToCalendar
                  title={`Golf at ${reround.course}${reround.group !== undefined ? ` - Group ${reround.group}` : ''}`}
                  description={`Additional round at ${reround.course}${reround.group !== undefined ? ` with Group ${reround.group}` : ''}`}
                  startDate={startDate}
                  endDate={endDate}
                  location="Bandon Dunes Golf Resort"
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
} 