import { Box } from '@mui/material';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import teamsData from '@/data/teams.json';
import { colors } from '@/styles/theme';
import PageContainer from '@/components/layout/PageContainer';

interface TeamMember {
  first_name: string;
  last_name: string;
  handicap: number;
}

interface TeamCardProps {
  teamName: string;
  players: TeamMember[];
  stats: {
    playerCount: number;
    averageHandicap: string;
  };
}

function TeamCard({ teamName, players, stats }: TeamCardProps) {
  return (
    <Box sx={{ flex: 1, width: '100%' }}>
      <Card>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 1, 
            color: colors.primary,
            fontWeight: 700,
            textAlign: 'center'
          }}
        >
          {teamName}
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mb: 3, 
            color: colors.secondary,
            textAlign: 'center'
          }}
        >
          {stats.playerCount} Players • Avg HC: {stats.averageHandicap}
        </Typography>
        {players.map((member) => (
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
            <Typography variant="h6" sx={{ color: colors.primary }}>
              {member.first_name} {member.last_name}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: colors.secondary,
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
      </Card>
    </Box>
  );
}

export default function TeamsPage() {
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
    <PageContainer title="Teams">
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          gap: 4, 
          maxWidth: '1200px',
          width: '100%'
        }}
      >
        <TeamCard 
          teamName="Team Thompson"
          players={teamThompson}
          stats={thompsonStats}
        />
        <TeamCard 
          teamName="Team Burgess"
          players={teamBurgess}
          stats={burgessStats}
        />
      </Box>
    </PageContainer>
  );
} 