'use client';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CourseScoreCard from '@/components/scoreboard/CourseScoreCard';
import MatchRow from '@/components/scoreboard/MatchRow';
import matchesData from '@/data/matches.json';
import { useState } from 'react';

interface Match {
  match: number;
  group: number;
  course: string;
  date: string;
  time: string;
  matchType: string;
  team_thompson: Player[];
  team_burgess: Player[];
  winner: string | null;
}

interface Player {
  name: string;
  handicap: number | string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`course-tabpanel-${index}`}
      aria-labelledby={`course-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function getTeamTotals(matches: Match[]) {
  let thompson = 0, burgess = 0;
  for (const m of matches) {
    if (m.winner === 'team_thompson') thompson += 1;
    else if (m.winner === 'team_burgess') burgess += 1;
    else if (m.winner === 'tie') { thompson += 0.5; burgess += 0.5; }
  }
  return { thompson, burgess };
}

const bandonMatches = matchesData.matches.filter(m => m.course === 'Bandon Dunes');
const pacificMatches = matchesData.matches.filter(m => m.course === 'Pacific Dunes');
const sheepRanchMatches = matchesData.matches.filter(m => m.course === 'Sheep Ranch');

const bandonTotals = getTeamTotals(bandonMatches);
const pacificTotals = getTeamTotals(pacificMatches);
const sheepRanchTotals = getTeamTotals(sheepRanchMatches);

const teamThompsonScore = bandonTotals.thompson + pacificTotals.thompson + sheepRanchTotals.thompson;
const teamBurgessScore = bandonTotals.burgess + pacificTotals.burgess + sheepRanchTotals.burgess;

export default function ScoreboardPage() {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        color: '#2c3e50',
        pt: { xs: 4, sm: 8 },
      }}
    >
      {/* Scoreboard Heading */}
      <Typography variant="h3" sx={{ mb: { xs: 2, sm: 4 }, fontWeight: 700, color: '#2c3e50' }}>
        Scoreboard
      </Typography>

      {/* Overall Score Display */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 4, sm: 8 },
          mb: { xs: 4, sm: 6 },
          width: '100%',
          maxWidth: 900,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" sx={{ color: '#3498db', fontWeight: 700, mb: 1 }}>
            Team Thompson
          </Typography>
          <Typography variant="h2" sx={{ color: '#3498db', fontWeight: 800 }}>
            {teamThompsonScore}
          </Typography>
        </Box>
        <Typography variant="h3" sx={{ color: '#666666', fontWeight: 300 }}>vs</Typography>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" sx={{ color: '#e74c3c', fontWeight: 700, mb: 1 }}>
            Team Burgess
          </Typography>
          <Typography variant="h2" sx={{ color: '#e74c3c', fontWeight: 800 }}>
            {teamBurgessScore}
          </Typography>
        </Box>
      </Box>

      {/* Course Tabs */}
      <Box sx={{ width: '100%', maxWidth: 900, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange} 
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: '#666666',
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                textTransform: 'none',
                '&.Mui-selected': {
                  color: '#2c3e50',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2c3e50',
              },
            }}
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
                team_thompson={match.team_thompson}
                team_burgess={match.team_burgess}
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
                team_thompson={match.team_thompson}
                team_burgess={match.team_burgess}
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
                team_thompson={match.team_thompson}
                team_burgess={match.team_burgess}
                winner={match.winner}
              />
            ))}
          </CourseScoreCard>
        </TabPanel>
      </Box>
    </Box>
  );
} 