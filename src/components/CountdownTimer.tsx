'use client';
import { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const teeOffDate = new Date('2025-06-05T09:00:00-08:00'); // 9 AM PST on June 5th, 2025
      const difference = teeOffDate.getTime() - new Date().getTime();

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }

      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, []);

  const timeUnits = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Minutes' },
    { value: timeLeft.seconds, label: 'Seconds' },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: { xs: 1, sm: 1.5 },
        px: { xs: 2, sm: 3 },
        bgcolor: '#ffffff',
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        maxWidth: '800px',
        width: '100%',
        mb: { xs: 4, sm: 6 },
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: '#2c3e50',
          fontWeight: 700,
          textAlign: 'center',
          mb: { xs: 0.75, sm: 1 },
          fontSize: { xs: '1rem', sm: '1.1rem' },
        }}
      >
        Countdown to First Tee Time
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 0.5, sm: 3 },
          width: '100%',
          justifyContent: 'center',
        }}
      >
        {timeUnits.map(({ value, label }) => (
          <Box
            key={label}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: { sm: '80px' },
            }}
          >
            <Typography
              variant="h5"
              sx={{
                color: '#2c3e50',
                fontWeight: 700,
                fontSize: { xs: '1.3rem', sm: '1.5rem' },
                lineHeight: 1.2,
              }}
            >
              {value.toString().padStart(2, '0')}
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
                color: '#666666',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
                lineHeight: 1.2,
              }}
            >
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
} 