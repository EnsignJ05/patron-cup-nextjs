'use client';
import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CourseScoreCard from '@/components/scoreboard/CourseScoreCard';
import MatchRow from '@/components/scoreboard/MatchRow';
import { getPlayerTeam } from '@/utils/playerUtils';

interface Player {
  name: string;
  handicap: number | string;
}

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

interface PlayerMatchesProps {
  playerName: string;
  matches: Match[];
}

const COURSE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Pacific Dunes', value: 'Pacific Dunes' },
  { label: 'Sheep Ranch', value: 'Sheep Ranch' },
  { label: 'Bandon Dunes', value: 'Bandon Dunes' },
];

export default function PlayerMatches({ playerName, matches }: PlayerMatchesProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState('all');

  const { pacificMatches, sheepRanchMatches, bandonMatches } = useMemo(() => {
    return {
      pacificMatches: matches.filter(m => m.course === 'Pacific Dunes'),
      sheepRanchMatches: matches.filter(m => m.course === 'Sheep Ranch'),
      bandonMatches: matches.filter(m => m.course === 'Bandon Dunes'),
    };
  }, [matches]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleDropdownChange = (event: SelectChangeEvent) => {
    setSelectedCourse(event.target.value as string);
  };

  // For dropdown filtering
  const getMatchesForCourse = (course: string) => {
    if (course === 'Pacific Dunes') return pacificMatches;
    if (course === 'Sheep Ranch') return sheepRanchMatches;
    if (course === 'Bandon Dunes') return bandonMatches;
    return matches;
  };

  // Render for mobile (dropdown)
  if (isMobile) {
    return (
      <Box sx={{ width: '100%', maxWidth: 900, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Select
            value={selectedCourse}
            onChange={handleDropdownChange}
            size="small"
            sx={{
              bgcolor: '#fff',
              borderRadius: 2,
              maxWidth: 220,
              width: '100%',
              mx: 'auto',
              textAlign: 'center',
              '& .MuiSelect-select': {
                textAlign: 'center',
              },
            }}
          >
            {COURSE_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value} sx={{ textAlign: 'center' }}>{option.label}</MenuItem>
            ))}
          </Select>
        </Box>
        {selectedCourse === 'all' ? (
          <>
            {pacificMatches.length > 0 && (
              <CourseScoreCard courseName="Pacific Dunes" date="June 5, 2025">
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
                    highlightTeam={getPlayerTeam(playerName, match)}
                  />
                ))}
              </CourseScoreCard>
            )}
            {sheepRanchMatches.length > 0 && (
              <CourseScoreCard courseName="Sheep Ranch" date="June 6, 2025">
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
                    highlightTeam={getPlayerTeam(playerName, match)}
                  />
                ))}
              </CourseScoreCard>
            )}
            {bandonMatches.length > 0 && (
              <CourseScoreCard courseName="Bandon Dunes" date="June 7, 2025">
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
                    highlightTeam={getPlayerTeam(playerName, match)}
                  />
                ))}
              </CourseScoreCard>
            )}
            {pacificMatches.length === 0 && sheepRanchMatches.length === 0 && bandonMatches.length === 0 && (
              <Typography variant="body1" sx={{ color: '#666666', fontStyle: 'italic', mt: 2, textAlign: 'center' }}>
                No matches found.
              </Typography>
            )}
          </>
        ) : (
          getMatchesForCourse(selectedCourse).length > 0 ? (
            <CourseScoreCard courseName={selectedCourse} date={
              selectedCourse === 'Pacific Dunes' ? 'June 5, 2025' :
              selectedCourse === 'Sheep Ranch' ? 'June 6, 2025' :
              selectedCourse === 'Bandon Dunes' ? 'June 7, 2025' : ''
            }>
              {getMatchesForCourse(selectedCourse).map((match) => (
                <MatchRow
                  key={match.match}
                  match={match.match}
                  group={match.group}
                  time={match.time}
                  date={match.date}
                  team_thompson={match.team_thompson}
                  team_burgess={match.team_burgess}
                  winner={match.winner}
                  highlightTeam={getPlayerTeam(playerName, match)}
                />
              ))}
            </CourseScoreCard>
          ) : (
            <Typography variant="body1" sx={{ color: '#666666', fontStyle: 'italic', mt: 2, textAlign: 'center' }}>
              No matches found for this course.
            </Typography>
          )
        )}
      </Box>
    );
  }

  // Render for desktop (tabs)
  return (
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
              highlightTeam={getPlayerTeam(playerName, match)}
            />
          ))}
        </CourseScoreCard>
      </TabPanel>

      {/* Sheep Ranch Tab Panel */}
      <TabPanel value={selectedTab} index={1}>
        <CourseScoreCard 
          courseName="Sheep Ranch" 
          date="June 6, 2025"
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
              highlightTeam={getPlayerTeam(playerName, match)}
            />
          ))}
        </CourseScoreCard>
      </TabPanel>

      {/* Bandon Dunes Tab Panel */}
      <TabPanel value={selectedTab} index={2}>
        <CourseScoreCard 
          courseName="Bandon Dunes" 
          date="June 7, 2025"
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
              highlightTeam={getPlayerTeam(playerName, match)}
            />
          ))}
        </CourseScoreCard>
      </TabPanel>
    </Box>
  );
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