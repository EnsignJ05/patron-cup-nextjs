'use client';
import { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { getAllPlayersAndMatches } from '@/lib/getAllPlayersAndMatches';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Test flag - set to true to test expired state
const TEST_EXPIRED = false;

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(TEST_EXPIRED);
  const [teamScores, setTeamScores] = useState({ thompson: 0, burgess: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      // If test flag is true, return expired state immediately
      if (TEST_EXPIRED) {
        setIsExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

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

      setIsExpired(true);
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

  useEffect(() => {
    if (isExpired) {
      getAllPlayersAndMatches()
        .then(({ matches }) => {
          let thompson = 0, burgess = 0;
          matches.forEach((m: any) => {
            if (m.winner === 'team_thompson') thompson += 1;
            else if (m.winner === 'team_burgess') burgess += 1;
            else if (m.winner === 'tie') { thompson += 0.5; burgess += 0.5; }
          });
          setTeamScores({ thompson, burgess });
        })
        .catch(console.error);
    }
  }, [isExpired]);

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
      {!isExpired ? (
        <>
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
              flexDirection: 'row',
              gap: { xs: 1, sm: 3 },
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
                  minWidth: { xs: '60px', sm: '80px' },
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
        </>
      ) : (
        <>
          <Typography
            variant="h6"
            sx={{
              color: '#2c3e50',
              fontWeight: 700,
              textAlign: 'center',
              mb: { xs: 1, sm: 2 },
              fontSize: { xs: '1.1rem', sm: '1.3rem' },
            }}
          >
            Scoreboard
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: { xs: 4, sm: 8 },
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h2"
                sx={{
                  color: '#3498db',
                  fontWeight: 700,
                  fontSize: { xs: '4rem', sm: '5rem' },
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {teamScores.thompson}
              </Typography>
              <Typography
                sx={{
                  color: '#3498db',
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', sm: '1rem' },
                  textTransform: 'uppercase',
                  borderBottom: '2px solid #3498db',
                  letterSpacing: '0.05em',
                }}
              >
                Team Thompson
              </Typography>
            </Box>

            {/* Vertical divider */}
            <Box
              sx={{
                width: '1px',
                height: { xs: '48px', sm: '64px' },
                bgcolor: '#e0e0e0',
                mx: { xs: 2, sm: 4 },
                borderRadius: 1,
              }}
            />

            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h2"
                sx={{
                  color: '#e74c3c',
                  fontWeight: 700,
                  fontSize: { xs: '4rem', sm: '5rem' },
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {teamScores.burgess}
              </Typography>
              <Typography
                sx={{
                  color: '#e74c3c',
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', sm: '1rem' },
                  textTransform: 'uppercase',
                  borderBottom: '2px solid #e74c3c',
                  letterSpacing: '0.05em',
                }}
              >
                Team Burgess
              </Typography>
            </Box>
          </Box>

          <Link
            href="/scoreboard"
            style={{
              textDecoration: 'underline',
              color: '#2c3e50',
              fontWeight: 500,
              fontSize: '1rem',
            }}
          >
            View scoreboard
          </Link>
        </>
      )}
    </Box>
  );
} 