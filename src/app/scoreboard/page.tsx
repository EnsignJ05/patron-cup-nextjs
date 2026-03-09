'use client';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CourseScoreCard from '@/components/scoreboard/CourseScoreCard';
import MatchRow from '@/components/scoreboard/MatchRow';
import { useState, useEffect } from 'react';
import { getAllPlayersAndMatches } from '@/lib/getAllPlayersAndMatches';
import styles from './page.module.css';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`course-tabpanel-${index}`}
      aria-labelledby={`course-tab-${index}`}
      {...other}
    >
      {value === index && <Box className={styles.tabPanelBody}>{children}</Box>}
    </div>
  );
}

function getTeamTotals(matches: any[]) {
  let thompson = 0, burgess = 0;
  for (const m of matches) {
    if (m.winner === 'team_thompson') thompson += 1;
    else if (m.winner === 'team_burgess') burgess += 1;
    else if (m.winner === 'tie') { thompson += 0.5; burgess += 0.5; }
  }
  return { thompson, burgess };
}

export default function ScoreboardPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    getAllPlayersAndMatches()
      .then(({ matches, players }) => {
        const playerMap = new Map(players.map((p: any) => [p.id, p]));
        const matchesWithPlayers = (matches || []).map((m: any) => ({
          ...m,
          thompson_player1: playerMap.get(m.thompson_player1) || null,
          thompson_player2: playerMap.get(m.thompson_player2) || null,
          burgess_player1: playerMap.get(m.burgess_player1) || null,
          burgess_player2: playerMap.get(m.burgess_player2) || null,
        }));
        setMatches(matchesWithPlayers);
      })
      .catch((err) => {
        console.error(err);
        setMatches([]);
      });
  }, []);

  // Group matches by course
  const pacificMatches = matches
    .filter(m => m.course === 'Pacific Dunes')
    .sort((a, b) => a.match - b.match);
  const sheepRanchMatches = matches
    .filter(m => m.course === 'Sheep Ranch')
    .sort((a, b) => a.match - b.match);
  const bandonMatches = matches
    .filter(m => m.course === 'Bandon Dunes')
    .sort((a, b) => a.match - b.match);

  // Calculate team totals
  const pacificTotals = getTeamTotals(pacificMatches);
  const sheepRanchTotals = getTeamTotals(sheepRanchMatches);
  const bandonTotals = getTeamTotals(bandonMatches);
  const teamThompsonScore = bandonTotals.thompson + pacificTotals.thompson + sheepRanchTotals.thompson;
  const teamBurgessScore = bandonTotals.burgess + pacificTotals.burgess + sheepRanchTotals.burgess;

  // Helper to build player arrays for MatchRow
  function buildTeamPlayers(match: any, team: 'thompson' | 'burgess') {
    if (team === 'thompson') {
      return [match.thompson_player1, match.thompson_player2]
        .filter(Boolean)
        .map((p: any) => ({
          name: p ? `${p.f_name} ${p.l_name}` : '',
          handicap: p?.handicap ?? '',
        }));
    } else {
      return [match.burgess_player1, match.burgess_player2]
        .filter(Boolean)
        .map((p: any) => ({
          name: p ? `${p.f_name} ${p.l_name}` : '',
          handicap: p?.handicap ?? '',
        }));
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Box className={styles.pageRoot}>
      {/* Scoreboard Heading */}
      <Typography variant="h3" className={styles.pageTitle}>
        Scoreboard
      </Typography>

      {/* Overall Score Display */}
      <Box className={styles.scoreboardRow}>
        <Box className={styles.scoreColumn}>
          <Typography variant="h4" className={styles.scoreLabelThompson}>
            Team Thompson
          </Typography>
          <Typography variant="h2" className={styles.scoreValueThompson}>
            {teamThompsonScore}
          </Typography>
        </Box>
        <Typography variant="h3" className={styles.scoreDivider}>vs</Typography>
        <Box className={styles.scoreColumn}>
          <Typography variant="h4" className={styles.scoreLabelBurgess}>
            Team Burgess
          </Typography>
          <Typography variant="h2" className={styles.scoreValueBurgess}>
            {teamBurgessScore}
          </Typography>
        </Box>
      </Box>

      {/* Course Tabs */}
      <Box className={styles.tabsWrap}>
        <Box className={styles.tabsBorder}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange} 
            variant="fullWidth"
            className={styles.tabs}
          >
            <Tab label="Pacific Dunes" />
            <Tab label="Sheep Ranch" />
            <Tab label="Bandon Dunes" />
          </Tabs>
        </Box>

        {/* Pacific Dunes Tab Panel */}
        <TabPanel value={selectedTab} index={0}>
          <CourseScoreCard 
            courseName="Pacific Dunes" 
            date="June 5, 2025" 
            teamThompsonTotal={pacificTotals.thompson}
            teamBurgessTotal={pacificTotals.burgess}
          >
            {pacificMatches.map((match) => (
              <MatchRow
                key={match.match}
                match={match.match}
                group={match.group}
                time={match.time}
                date={match.date}
                team_thompson={buildTeamPlayers(match, 'thompson')}
                team_burgess={buildTeamPlayers(match, 'burgess')}
                winner={match.winner}
              />
            ))}
          </CourseScoreCard>
        </TabPanel>

        {/* Sheep Ranch Tab Panel */}
        <TabPanel value={selectedTab} index={1}>
          <CourseScoreCard 
            courseName="Sheep Ranch" 
            date="June 6, 2025" 
            teamThompsonTotal={sheepRanchTotals.thompson}
            teamBurgessTotal={sheepRanchTotals.burgess}
          >
            {sheepRanchMatches.map((match) => (
              <MatchRow
                key={match.match}
                match={match.match}
                group={match.group}
                time={match.time}
                date={match.date}
                team_thompson={buildTeamPlayers(match, 'thompson')}
                team_burgess={buildTeamPlayers(match, 'burgess')}
                winner={match.winner}
              />
            ))}
          </CourseScoreCard>
        </TabPanel>

        {/* Bandon Dunes Tab Panel */}
        <TabPanel value={selectedTab} index={2}>
          <CourseScoreCard 
            courseName="Bandon Dunes" 
            date="June 7, 2025" 
            teamThompsonTotal={bandonTotals.thompson}
            teamBurgessTotal={bandonTotals.burgess}
          >
            {bandonMatches.map((match) => (
              <MatchRow
                key={match.match}
                match={match.match}
                group={match.group}
                time={match.time}
                date={match.date}
                team_thompson={buildTeamPlayers(match, 'thompson')}
                team_burgess={buildTeamPlayers(match, 'burgess')}
                winner={match.winner}
              />
            ))}
          </CourseScoreCard>
        </TabPanel>
      </Box>
    </Box>
  );
} 