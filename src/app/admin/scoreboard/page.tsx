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
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
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

export default function AdminScoreboardPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState(0);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.push('/login');
      return;
    }

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
  }, [isAuthenticated, isAdmin, router]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleMatchResultChange = async (matchId: number, newResult: string | null) => {
    console.log('handleMatchResultChange', matchId, newResult);
    try {
      const { error } = await supabase
        .from('match_bandon')
        .update({ winner: newResult === 'none' ? null : newResult })
        .eq('id', matchId);

      if (error) throw error;

      // Update local state
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

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

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
      <Typography variant="h3" sx={{ mb: { xs: 2, sm: 4 }, fontWeight: 700, color: '#2c3e50' }}>
        Admin Scoreboard
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
              <Box
                key={match.id}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  p: 2,
                  borderBottom: '1px solid #eee',
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                  gap: { xs: 2, sm: 0 },
                }}
              >
                <Box sx={{ flex: 1, width: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Match {match.match} - Group {match.group}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {match.time}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ color: '#3498db' }}>
                      {buildTeamPlayers(match, 'thompson').map(p => p.name).join(' & ')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e74c3c' }}>
                      {buildTeamPlayers(match, 'burgess').map(p => p.name).join(' & ')}
                    </Typography>
                  </Box>
                </Box>
                <ToggleButtonGroup
                  value={match.winner || 'none'}
                  exclusive
                  onChange={(e, value) => handleMatchResultChange(match.id, value)}
                  size="small"
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    justifyContent: { xs: 'center', sm: 'flex-end' },
                    '& .MuiToggleButton-root': {
                      color: '#2c3e50',
                      borderColor: 'rgba(0, 0, 0, 0.12)',
                      '&.Mui-selected': {
                        backgroundColor: '#2c3e50',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#1a252f',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(44, 62, 80, 0.04)',
                      },
                    },
                  }}
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
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  p: 2,
                  borderBottom: '1px solid #eee',
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                  gap: { xs: 2, sm: 0 },
                }}
              >
                <Box sx={{ flex: 1, width: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Match {match.match} - Group {match.group}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {match.time}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ color: '#3498db' }}>
                      {buildTeamPlayers(match, 'thompson').map(p => p.name).join(' & ')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e74c3c' }}>
                      {buildTeamPlayers(match, 'burgess').map(p => p.name).join(' & ')}
                    </Typography>
                  </Box>
                </Box>
                <ToggleButtonGroup
                  value={match.winner || 'none'}
                  exclusive
                  onChange={(e, value) => handleMatchResultChange(match.id, value)}
                  size="small"
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    justifyContent: { xs: 'center', sm: 'flex-end' },
                    '& .MuiToggleButton-root': {
                      color: '#2c3e50',
                      borderColor: 'rgba(0, 0, 0, 0.12)',
                      '&.Mui-selected': {
                        backgroundColor: '#2c3e50',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#1a252f',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(44, 62, 80, 0.04)',
                      },
                    },
                  }}
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
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  p: 2,
                  borderBottom: '1px solid #eee',
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                  gap: { xs: 2, sm: 0 },
                }}
              >
                <Box sx={{ flex: 1, width: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Match {match.match} - Group {match.group}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {match.time}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ color: '#3498db' }}>
                      {buildTeamPlayers(match, 'thompson').map(p => p.name).join(' & ')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e74c3c' }}>
                      {buildTeamPlayers(match, 'burgess').map(p => p.name).join(' & ')}
                    </Typography>
                  </Box>
                </Box>
                <ToggleButtonGroup
                  value={match.winner || 'none'}
                  exclusive
                  onChange={(e, value) => handleMatchResultChange(match.id, value)}
                  size="small"
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    justifyContent: { xs: 'center', sm: 'flex-end' },
                    '& .MuiToggleButton-root': {
                      color: '#2c3e50',
                      borderColor: 'rgba(0, 0, 0, 0.12)',
                      '&.Mui-selected': {
                        backgroundColor: '#2c3e50',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#1a252f',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(44, 62, 80, 0.04)',
                      },
                    },
                  }}
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