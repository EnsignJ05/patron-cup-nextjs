'use client';
import { useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabaseClient';
import styles from './PlayerMatches.module.css';

export interface PlayerMatchesProps {
  playerId?: string;
  selectedCourse?: string;
}

export default function PlayerMatches({ playerId: propPlayerId, selectedCourse: selectedCourseProp }: PlayerMatchesProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedCourse, setSelectedCourse] = useState(selectedCourseProp || 'all');
  const [matches, setMatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Query for matches where player is in any slot
    supabase
      .from('match_bandon')
      .select('*')
      .or(`thompson_player1.eq.${propPlayerId},thompson_player2.eq.${propPlayerId},burgess_player1.eq.${propPlayerId},burgess_player2.eq.${propPlayerId}`)
      .then(({ data: matches, error: matchError }) => {
        if (matchError) {
          setMatches([]);
          setLoading(false);
          return;
        }
        setMatches(matches || []);
        
        // Get all unique player IDs from matches
        const playerIds = new Set<string>();
        matches?.forEach(match => {
          ['thompson_player1', 'thompson_player2', 'burgess_player1', 'burgess_player2'].forEach(field => {
            if (match[field]) playerIds.add(match[field]);
          });
        });

        // Fetch player data for all players in matches
        if (playerIds.size > 0) {
          supabase
            .from('player')
            .select('*')
            .in('id', Array.from(playerIds))
            .then(({ data: playerData, error: playerError }) => {
              if (!playerError && playerData) {
                const playerMap = playerData.reduce((acc, player) => {
                  acc[player.id] = player;
                  return acc;
                }, {});
                setPlayers(playerMap);
              }
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [propPlayerId]);

  const handleCourseChange = (event: SelectChangeEvent) => {
    setSelectedCourse(event.target.value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedCourse(newValue);
  };

  const filteredMatches = matches.filter(match => 
    selectedCourse === 'all' || match.course === selectedCourse
  );

  function buildTeam(match: any, playerFields: string[]) {
    return playerFields
      .map(field => match[field])
      .filter(Boolean)
      .map(playerId => {
        const player = players[playerId];
        return {
          name: player ? `${player.f_name} ${player.l_name}` : 'Unknown Player',
          handicap: player?.handicap || 0
        };
      });
  }

  if (loading) {
    return (
      <Box className={styles.loading}>
        <Typography variant="body1" className={styles.loadingText}>
          Loading matches...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {isMobile ? (
        <Select
          value={selectedCourse}
          onChange={handleCourseChange}
          fullWidth
          className={styles.courseSelect}
        >
          <MenuItem value="all">All Courses</MenuItem>
          <MenuItem value="Pacific Dunes">Pacific Dunes</MenuItem>
          <MenuItem value="Sheep Ranch">Sheep Ranch</MenuItem>
          <MenuItem value="Bandon Dunes">Bandon Dunes</MenuItem>
        </Select>
      ) : (
        <Tabs
          value={selectedCourse}
          onChange={handleTabChange}
          centered
          className={styles.tabs}
        >
          <Tab label="All Courses" value="all" />
          <Tab label="Pacific Dunes" value="Pacific Dunes" />
          <Tab label="Sheep Ranch" value="Sheep Ranch" />
          <Tab label="Bandon Dunes" value="Bandon Dunes" />
        </Tabs>
      )}

      {filteredMatches.length === 0 ? (
        <Typography variant="body1" className={styles.emptyState}>
          No matches found.
        </Typography>
      ) : (
        <Box className={styles.matchList}>
          <CourseScoreCard courseName={selectedCourse !== 'all' ? selectedCourse : ''} date={
            selectedCourse === 'Pacific Dunes' ? 'June 5, 2025' :
            selectedCourse === 'Sheep Ranch' ? 'June 6, 2025' :
            selectedCourse === 'Bandon Dunes' ? 'June 7, 2025' : ''
          }>
            {filteredMatches.map((match: any) => (
              <MatchRow
                key={match.match}
                match={match.match}
                group={match.group}
                time={match.time}
                date={match.date}
                team_thompson={buildTeam(match, ['thompson_player1', 'thompson_player2'])}
                team_burgess={buildTeam(match, ['burgess_player1', 'burgess_player2'])}
                winner={match.winner}
                highlightTeam={match.thompson_player1 === propPlayerId || match.thompson_player2 === propPlayerId ? 'Thompson' : 'Burgess'}
              />
            ))}
          </CourseScoreCard>
        </Box>
      )}
    </Box>
  );
} 