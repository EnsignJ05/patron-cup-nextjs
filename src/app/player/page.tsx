'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Card, CardContent, Tabs, Tab, Select, MenuItem, FormControl } from '@mui/material';
import { styles } from '@/styles/pages/player/styles';
import { useMediaQuery, useTheme } from '@mui/material';
import PlayerMatches from '@/components/player/PlayerMatches';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { SelectChangeEvent } from '@mui/material/Select';

export default function PlayerPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleCourseChange = (event: SelectChangeEvent) => {
    setSelectedCourse(event.target.value as string);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box sx={styles.container}>
      <Typography variant="h3" sx={styles.title}>
        Player Dashboard
      </Typography>

      <Card sx={styles.playerCard}>
        <CardContent sx={styles.playerInfo}>
          <Typography variant="h4" sx={styles.playerName}>
            Player Name
          </Typography>
          <Box sx={styles.playerDetails}>
            <Typography>Handicap: 10</Typography>
            <Typography>2025 Record: 5-2-1</Typography>
          </Box>
        </CardContent>
      </Card>

      <Box sx={styles.matchesContainer}>
        {isMobile ? (
          <FormControl fullWidth sx={styles.mobileSelect}>
            <Select
              value={selectedCourse}
              onChange={handleCourseChange}
              displayEmpty
            >
              <MenuItem value="all">All Matches</MenuItem>
              <MenuItem value="course1">Course 1</MenuItem>
              <MenuItem value="course2">Course 2</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <Box sx={styles.tabsContainer}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              sx={styles.tab}
              TabIndicatorProps={{ sx: styles.tabIndicator }}
            >
              <Tab label="All Matches" />
              <Tab label="Course 1" />
              <Tab label="Course 2" />
            </Tabs>
          </Box>
        )}

        <PlayerMatches
          playerName="Player Name"
          selectedCourse={isMobile ? selectedCourse : selectedTab === 0 ? 'all' : `course${selectedTab}`}
        />
      </Box>
    </Box>
  );
} 