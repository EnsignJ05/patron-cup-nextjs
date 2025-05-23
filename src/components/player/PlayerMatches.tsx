'use client';
import { useState } from 'react';
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
import { getPlayerTeam, getPlayerMatches } from '@/utils/playerUtils';
import type { Match } from '@/utils/playerUtils';

// interface Player {
//   name: string;
//   handicap: number | string;
// }

export interface PlayerMatchesProps {
  playerName: string;
  selectedCourse?: string;
}

const COURSE_OPTIONS = [
  { label: 'All Matches', value: 'all' },
  { label: 'Pacific Dunes', value: 'Pacific Dunes' },
  { label: 'Sheep Ranch', value: 'Sheep Ranch' },
  { label: 'Bandon Dunes', value: 'Bandon Dunes' },
];

export default function PlayerMatches({ playerName, selectedCourse: selectedCourseProp }: PlayerMatchesProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedCourse, setSelectedCourse] = useState(selectedCourseProp || 'all');
  const [selectedTab, setSelectedTab] = useState(0);

  const matches = getPlayerMatches(playerName);
  const filteredMatches = selectedCourse === 'all'
    ? matches
    : matches.filter(match => match.course === selectedCourse);

  // Mobile dropdown handler
  const handleDropdownChange = (event: SelectChangeEvent<string>) => {
    setSelectedCourse(event.target.value);
    // Also update tab index for consistency if needed
    const idx = COURSE_OPTIONS.findIndex(opt => opt.value === event.target.value);
    setSelectedTab(idx === -1 ? 0 : idx);
  };

  // Desktop tab handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    setSelectedCourse(COURSE_OPTIONS[newValue].value);
  };

  // Mobile rendering
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
        {filteredMatches.length === 0 ? (
          <Typography variant="body1" sx={{ color: '#666666', fontStyle: 'italic', mt: 2, textAlign: 'center' }}>
            No matches found.
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            <CourseScoreCard courseName={selectedCourse !== 'all' ? selectedCourse : ''} date={
              selectedCourse === 'Pacific Dunes' ? 'June 5, 2025' :
              selectedCourse === 'Sheep Ranch' ? 'June 6, 2025' :
              selectedCourse === 'Bandon Dunes' ? 'June 7, 2025' : ''
            }>
              {filteredMatches.map((match: Match) => (
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
          </Box>
        )}
      </Box>
    );
  }

  // Desktop rendering
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
          {COURSE_OPTIONS.map((option) => (
            <Tab key={option.value} label={option.label} />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ mt: 2 }}>
        {filteredMatches.length === 0 ? (
          <Typography variant="body1" sx={{ color: '#666666', fontStyle: 'italic', mt: 2, textAlign: 'center' }}>
            No matches found.
          </Typography>
        ) : (
          <CourseScoreCard courseName={selectedCourse !== 'all' ? selectedCourse : ''} date={
            selectedCourse === 'Pacific Dunes' ? 'June 5, 2025' :
            selectedCourse === 'Sheep Ranch' ? 'June 6, 2025' :
            selectedCourse === 'Bandon Dunes' ? 'June 7, 2025' : ''
          }>
            {filteredMatches.map((match: Match) => (
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
      </Box>
    </Box>
  );
}

// interface TabPanelProps {
//   children?: React.ReactNode;
//   index: number;
//   value: number;
// }

// function TabPanel(props: TabPanelProps) {
//   const { children, value, index, ...other } = props;

//   return (
//     <div
//       role="tabpanel"
//       hidden={value !== index}
//       id={`course-tabpanel-${index}`}
//       aria-labelledby={`course-tab-${index}`}
//       {...other}
//     >
//       {value === index && (
//         <Box sx={{ py: 3 }}>
//           {children}
//         </Box>
//       )}
//     </div>
//   );
// } 