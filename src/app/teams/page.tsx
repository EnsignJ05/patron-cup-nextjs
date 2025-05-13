'use client';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import teamsData from '@/data/teams.json';

interface TeamMember {
  first_name: string;
  last_name: string;
  handicap: number;
}

export default function TeamsPage() {
  const showTeams = process.env.NEXT_PUBLIC_SHOW_TEAMS === 'true';

  // Sort team members by handicap
  const teamThompson = [...teamsData.team_thompson].sort((a, b) => a.handicap - b.handicap);
  const teamBurgess = [...teamsData.team_burgess].sort((a, b) => a.handicap - b.handicap);

  // Calculate team statistics
  const getTeamStats = (team: TeamMember[]) => {
    const totalHandicap = team.reduce((sum, member) => sum + member.handicap, 0);
    return {
      averageHandicap: (totalHandicap / team.length).toFixed(1),
      playerCount: team.length,
    };
  };

  const thompsonStats = getTeamStats(teamThompson);
  const burgessStats = getTeamStats(teamBurgess);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: { xs: 4, sm: 8 },
        px: { xs: 2, sm: 4 },
      }}
    >
      <Typography 
        variant="h3" 
        sx={{ 
          mb: { xs: 4, sm: 6 }, 
          color: '#2c3e50',
          fontWeight: 700,
          textAlign: 'center'
        }}
      >
        Teams
      </Typography>

      {!showTeams ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 4,
            bgcolor: '#ffffff',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: '#2c3e50',
              fontWeight: 700,
              textAlign: 'center',
              mb: 2,
            }}
          >
            Coming Soon
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#666666',
              textAlign: 'center',
              fontSize: 18,
            }}
          >
            The Teams Are Almost Ready... Unlike your liver after this trip.
          </Typography>
        </Box>
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 4, 
            maxWidth: '1200px',
            width: '100%'
          }}
        >
          {/* Team Thompson */}
          <Box sx={{ flex: 1, width: '100%' }}>
            <Card 
              sx={{ 
                height: '100%',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                },
              }}
            >
              <CardContent>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    mb: 1, 
                    color: '#2c3e50',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}
                >
                  Team Thompson
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    mb: 3, 
                    color: '#666666',
                    textAlign: 'center'
                  }}
                >
                  {thompsonStats.playerCount} Players • Avg HC: {thompsonStats.averageHandicap}
                </Typography>
                {teamThompson.map((member) => (
                  <Box 
                    key={`${member.first_name}-${member.last_name}`}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: '1px solid rgba(0,0,0,0.08)',
                      '&:last-child': {
                        borderBottom: 'none',
                      },
                    }}
                  >
                    <Typography variant="h6" sx={{ color: '#2c3e50' }}>
                      {member.first_name} {member.last_name}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#666666',
                        bgcolor: 'rgba(0,0,0,0.04)',
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        fontWeight: 600,
                      }}
                    >
                      HC: {member.handicap}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>

          {/* Team Burgess */}
          <Box sx={{ flex: 1, width: '100%' }}>
            <Card 
              sx={{ 
                height: '100%',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                },
              }}
            >
              <CardContent>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    mb: 1, 
                    color: '#2c3e50',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}
                >
                  Team Burgess
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    mb: 3, 
                    color: '#666666',
                    textAlign: 'center'
                  }}
                >
                  {burgessStats.playerCount} Players • Avg HC: {burgessStats.averageHandicap}
                </Typography>
                {teamBurgess.map((member) => (
                  <Box 
                    key={`${member.first_name}-${member.last_name}`}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: '1px solid rgba(0,0,0,0.08)',
                      '&:last-child': {
                        borderBottom: 'none',
                      },
                    }}
                  >
                    <Typography variant="h6" sx={{ color: '#2c3e50' }}>
                      {member.first_name} {member.last_name}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#666666',
                        bgcolor: 'rgba(0,0,0,0.04)',
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        fontWeight: 600,
                      }}
                    >
                      HC: {member.handicap}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  );
} 