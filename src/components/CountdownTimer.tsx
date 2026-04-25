'use client';
import { useState, useEffect, useMemo } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { getTeamTotals } from '@/lib/matchScoring';
import styles from './CountdownTimer.module.css';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

type ScoreboardTeam = {
  id: string;
  name: string;
  color: string | null;
};

// Test flag - set to true to test expired state
const TEST_EXPIRED = false;

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(TEST_EXPIRED);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [teams, setTeams] = useState<ScoreboardTeam[]>([]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      // If test flag is true, return expired state immediately
      if (TEST_EXPIRED) {
        setIsExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      // April 22, 2026 at 9:00 am Central Standard Time (CST is UTC-6)
      const teeOffDate = new Date('2026-04-23T07:15:00-06:00');
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
    if (!isExpired) return;

    const loadScores = async () => {
      const { data: activeEvent } = await supabase
        .from('events')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!activeEvent) return;

      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from('teams').select('id, name, color').eq('event_id', activeEvent.id).order('name'),
        supabase
          .from('matches')
          .select('winner_team_id, is_halved')
          .eq('event_id', activeEvent.id),
      ]);

      if (teamsRes.error || matchesRes.error) {
        console.error(teamsRes.error || matchesRes.error);
        return;
      }

      const teamsData = teamsRes.data || [];
      const matchesData = matchesRes.data || [];
      setTeams(teamsData);
      setTeamScores(getTeamTotals(matchesData, teamsData.map((team) => team.id)));
    };

    loadScores().catch(console.error);
  }, [isExpired, supabase]);

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
          <Typography variant="h6" className={styles.scoreboardTitle}>
            Overall Score
          </Typography>

          <Box
            className={styles.scoreboardRow}
          >
            <Box
              className={styles.scoreColumn}
              style={{ ['--team-color' as string]: teams[0]?.color || 'var(--accent-blue)' }}
            >
              <Typography variant="h2" className={styles.scoreValue}>
                {teamScores[teams[0]?.id || ''] ?? 0}
              </Typography>
              <Typography className={styles.scoreLabel}>
                {teams[0]?.name || 'Team A'}
              </Typography>
            </Box>

            {/* Vertical divider */}
            <Box className={styles.scoreDivider} />

            <Box
              className={styles.scoreColumn}
              style={{ ['--team-color' as string]: teams[1]?.color || 'var(--accent-red)' }}
            >
              <Typography variant="h2" className={styles.scoreValue}>
                {teamScores[teams[1]?.id || ''] ?? 0}
              </Typography>
              <Typography className={styles.scoreLabel}>
                {teams[1]?.name || 'Team B'}
              </Typography>
            </Box>
          </Box>

          <Link href="/matches" className={styles.scoreLink}>
            View matches
          </Link>
        </>
      )}
    </Box>
  );
} 