'use client';
import { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { getAllPlayersAndMatches } from '@/lib/getAllPlayersAndMatches';
import styles from './CountdownTimer.module.css';

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

      // April 22, 2026 at 9:00 am Central Standard Time (CST is UTC-6)
      const teeOffDate = new Date('2026-04-22T09:00:00-06:00');
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
    <Box className={styles.timerCard}>
      {!isExpired ? (
        <>
          <Typography
            variant="h6"
            className={styles.countdownTitle}
          >
            Countdown to First Tee Time
          </Typography>

          <Box
            className={styles.timeUnits}
          >
            {timeUnits.map(({ value, label }) => (
              <Box
                key={label}
                className={styles.timeUnit}
              >
                <Typography
                  variant="h5"
                  className={styles.timeValue}
                >
                  {value.toString().padStart(2, '0')}
                </Typography>
                <Typography
                  variant="subtitle2"
                  className={styles.timeLabel}
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
            className={styles.scoreboardTitle}
          >
            Scoreboard
          </Typography>

          <Box
            className={styles.scoreboardRow}
          >
            <Box className={styles.scoreColumn}>
              <Typography
                variant="h2"
                className={styles.scoreValueThompson}
              >
                {teamScores.thompson}
              </Typography>
              <Typography
                className={styles.scoreLabelThompson}
              >
                Team Thompson
              </Typography>
            </Box>

            {/* Vertical divider */}
            <Box className={styles.scoreDivider} />

            <Box className={styles.scoreColumn}>
              <Typography
                variant="h2"
                className={styles.scoreValueBurgess}
              >
                {teamScores.burgess}
              </Typography>
              <Typography
                className={styles.scoreLabelBurgess}
              >
                Team Burgess
              </Typography>
            </Box>
          </Box>

          <Link
            href="/scoreboard"
            className={styles.scoreLink}
          >
            View scoreboard
          </Link>
        </>
      )}
    </Box>
  );
} 