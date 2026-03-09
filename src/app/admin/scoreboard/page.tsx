'use client';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CourseScoreCard from '@/components/scoreboard/CourseScoreCard';
import { useState, useEffect } from 'react';
import { getAllPlayersAndMatches } from '@/lib/getAllPlayersAndMatches';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { supabase } from '@/lib/supabaseClient';
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

function buildTeamPlayers(match: any, team: 'thompson' | 'burgess') {
  console.log('buildTeamPlayers', match, team);
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

// Helper to increment/decrement a player's record
async function updatePlayerRecord(playerId: number, field: 'wins' | 'losses' | 'ties', delta: number) {
  // Fetch current record
  const { data: record } = await supabase
    .from('records_bandon')
    .select('id, wins, losses, ties')
    .eq('playerId', playerId)
    .single();

  let newRecord = { wins: 0, losses: 0, ties: 0 };
  if (record) {
    newRecord = {
      wins: record.wins ?? 0,
      losses: record.losses ?? 0,
      ties: record.ties ?? 0,
    };
  }
  newRecord[field] = Math.max(0, (newRecord[field] ?? 0) + delta);

  // Update the record
  await supabase
    .from('records_bandon')
    .update({
      wins: newRecord.wins,
      losses: newRecord.losses,
      ties: newRecord.ties,
    })
    .eq('playerId', playerId);
}

// Helper to update all players in a match for a given result
async function updateRecordsForResult(match: any, result: string | null, delta: number) {
  const thompsonPlayers = [match.thompson_player1, match.thompson_player2].filter(Boolean).map(p => p?.id);
  const burgessPlayers = [match.burgess_player1, match.burgess_player2].filter(Boolean).map(p => p?.id);
  if (result === 'team_thompson') {
    for (const id of thompsonPlayers) await updatePlayerRecord(id, 'wins', delta);
    for (const id of burgessPlayers) await updatePlayerRecord(id, 'losses', delta);
  } else if (result === 'team_burgess') {
    for (const id of burgessPlayers) await updatePlayerRecord(id, 'wins', delta);
    for (const id of thompsonPlayers) await updatePlayerRecord(id, 'losses', delta);
  } else if (result === 'tie') {
    for (const id of thompsonPlayers) await updatePlayerRecord(id, 'ties', delta);
    for (const id of burgessPlayers) await updatePlayerRecord(id, 'ties', delta);
  }
}

export default function AdminScoreboardPage() {
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleMatchResultChange = async (matchId: number, newResult: string | null) => {
    console.log('handleMatchResultChange', matchId, newResult);
    try {
      // Find the match and previous result
      const match = matches.find(m => m.id === matchId);
      if (!match) throw new Error('Match not found');
      const prevResult = match.winner || 'none';

      // 1. Decrement previous result (if not none)
      if (prevResult && prevResult !== 'none') {
        await updateRecordsForResult(match, prevResult, -1);
      }
      // 2. Increment new result (if not none)
      if (newResult && newResult !== 'none') {
        await updateRecordsForResult(match, newResult, 1);
      }

      // 3. Update match result in DB
      const { error } = await supabase
        .from('match_bandon')
        .update({ winner: newResult === 'none' ? null : newResult })
        .eq('id', matchId);
      if (error) throw error;

      // 4. Update local state
      setMatches(matches.map(match => 
        match.id === matchId 
          ? { ...match, winner: newResult === 'none' ? null : newResult }
          : match
      ));
    } catch (error) {
      console.error('Error updating match result:', error);
    }
  };

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

  return (
    <Box className={styles.pageRoot}>
      <Typography variant="h3" className={styles.pageTitle}>
        Admin Scoreboard
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
              <Box
                key={match.id}
                className={styles.matchRow}
              >
                <Box className={styles.matchInfo}>
                  <Typography variant="subtitle1" className={styles.matchTitle}>
                    Match {match.match} - Group {match.group}
                  </Typography>
                  <Typography variant="body2" className={styles.matchTime}>
                    {match.time}
                  </Typography>
                  <Box className={styles.matchTeams}>
                    <Typography variant="body2" className={styles.teamThompson}>
                      {buildTeamPlayers(match, 'thompson').map(p => p.name).join(' & ')}
                    </Typography>
                    <Typography variant="body2" className={styles.teamBurgess}>
                      {buildTeamPlayers(match, 'burgess').map(p => p.name).join(' & ')}
                    </Typography>
                  </Box>
                </Box>
                <ToggleButtonGroup
                  value={match.winner || 'none'}
                  exclusive
                  onChange={(e, value) => handleMatchResultChange(match.id, value)}
                  size="small"
                  className={styles.toggleGroup}
                >
                  <ToggleButton value="none">None</ToggleButton>
                  <ToggleButton value="tie">Tie</ToggleButton>
                  <ToggleButton value="team_burgess">Burgess</ToggleButton>
                  <ToggleButton value="team_thompson">Thompson</ToggleButton>
                </ToggleButtonGroup>
              </Box>
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
              <Box
                key={match.id}
                className={styles.matchRow}
              >
                <Box className={styles.matchInfo}>
                  <Typography variant="subtitle1" className={styles.matchTitle}>
                    Match {match.match} - Group {match.group}
                  </Typography>
                  <Typography variant="body2" className={styles.matchTime}>
                    {match.time}
                  </Typography>
                  <Box className={styles.matchTeams}>
                    <Typography variant="body2" className={styles.teamThompson}>
                      {buildTeamPlayers(match, 'thompson').map(p => p.name).join(' & ')}
                    </Typography>
                    <Typography variant="body2" className={styles.teamBurgess}>
                      {buildTeamPlayers(match, 'burgess').map(p => p.name).join(' & ')}
                    </Typography>
                  </Box>
                </Box>
                <ToggleButtonGroup
                  value={match.winner || 'none'}
                  exclusive
                  onChange={(e, value) => handleMatchResultChange(match.id, value)}
                  size="small"
                  className={styles.toggleGroup}
                >
                  <ToggleButton value="none">None</ToggleButton>
                  <ToggleButton value="tie">Tie</ToggleButton>
                  <ToggleButton value="team_burgess">Burgess</ToggleButton>
                  <ToggleButton value="team_thompson">Thompson</ToggleButton>
                </ToggleButtonGroup>
              </Box>
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
              <Box
                key={match.id}
                className={styles.matchRow}
              >
                <Box className={styles.matchInfo}>
                  <Typography variant="subtitle1" className={styles.matchTitle}>
                    Match {match.match} - Group {match.group}
                  </Typography>
                  <Typography variant="body2" className={styles.matchTime}>
                    {match.time}
                  </Typography>
                  <Box className={styles.matchTeams}>
                    <Typography variant="body2" className={styles.teamThompson}>
                      {buildTeamPlayers(match, 'thompson').map(p => p.name).join(' & ')}
                    </Typography>
                    <Typography variant="body2" className={styles.teamBurgess}>
                      {buildTeamPlayers(match, 'burgess').map(p => p.name).join(' & ')}
                    </Typography>
                  </Box>
                </Box>
                <ToggleButtonGroup
                  value={match.winner || 'none'}
                  exclusive
                  onChange={(e, value) => handleMatchResultChange(match.id, value)}
                  size="small"
                  className={styles.toggleGroup}
                >
                  <ToggleButton value="none">None</ToggleButton>
                  <ToggleButton value="tie">Tie</ToggleButton>
                  <ToggleButton value="team_burgess">Burgess</ToggleButton>
                  <ToggleButton value="team_thompson">Thompson</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            ))}
          </CourseScoreCard>
        </TabPanel>
      </Box>
    </Box>
  );
} 