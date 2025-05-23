'use client';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { getPlayerRerounds } from '@/utils/playerUtils';
import type { Reround } from '@/utils/playerUtils';

export interface PlayerReroundsProps {
  playerName: string;
}

export default function PlayerRerounds({ playerName }: PlayerReroundsProps) {
  const rerounds = getPlayerRerounds(playerName);

  if (rerounds.length === 0) {
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
        {rerounds.map((reround: Reround) => {
          // Parse date and time for calendar
          const [month, day, year] = reround.date.split('/');
          // const [hours, minutes] = reround.time.split(':');
          // const ampm = reround.time.split(' ')[1];
          // const hour = ampm === 'PM' ? parseInt(hours) + 12 : parseInt(hours);
          
          // const startDate = new Date(parseInt(`20${year}`), parseInt(month) - 1, parseInt(day), hour, parseInt(minutes));
          // const endDate = new Date(startDate.getTime() + (4 * 60 * 60 * 1000)); // 4 hours duration

          // Format date for display
          const displayDate = new Date(parseInt(`20${year}`), parseInt(month) - 1, parseInt(day));
          const formattedDate = displayDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <Card key={`${reround.date}-${reround.time}`} sx={{ mb: 2 }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#2c3e50', fontWeight: 500 }}>
                    {formattedDate}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    {reround.time}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#2c3e50', fontWeight: 500 }}>
                    {reround.course}
                  </Typography>
                  {reround.group && (
                    <Typography variant="body2" sx={{ color: '#666666', fontStyle: 'italic' }}>
                      Group {reround.group}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
} 