import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CourseScoreCard from '@/components/scoreboard/CourseScoreCard';
import MatchRow from '@/components/scoreboard/MatchRow';
import matchesData from '@/data/matches.json';

interface Match {
  winner?: string | null;
}

function getTeamTotals(matches: Match[]) {
  let bolton = 0, ensign = 0;
  for (const m of matches) {
    if (m.winner === 'team_bolton') bolton += 1;
    else if (m.winner === 'team_ensign') ensign += 1;
    else if (m.winner === 'tie') { bolton += 0.5; ensign += 0.5; }
  }
  return { bolton, ensign };
}

const bandonMatches = matchesData.matches.filter(m => m.course === 'Bandon Dunes');
const pacificMatches = matchesData.matches.filter(m => m.course === 'Pacific Dunes');
const oldMacMatches = matchesData.matches.filter(m => m.course === 'Old Macdonald');

const bandonTotals = getTeamTotals(bandonMatches);
const pacificTotals = getTeamTotals(pacificMatches);
const oldMacTotals = getTeamTotals(oldMacMatches);

const teamBoltonScore = bandonTotals.bolton + pacificTotals.bolton + oldMacTotals.bolton;
const teamEnsignScore = bandonTotals.ensign + pacificTotals.ensign + oldMacTotals.ensign;

export default function ScoreboardPage() {
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
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 2, sm: 6, md: 10 },
          mb: { xs: 4, sm: 6 },
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.85)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: 700,
          minHeight: 120,
        }}
      >
        {/* Team Bolton */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2c3e50', fontSize: { xs: 18, sm: 24 } }}>
            Team Bolton
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#2c3e50', mt: 0.5 }}>
            {teamBoltonScore}
          </Typography>
        </Box>
        {/* Separator */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#666666', mt: 2 }}>
            :
          </Typography>
        </Box>
        {/* Team Ensign */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2c3e50', fontSize: { xs: 18, sm: 24 } }}>
            Team Ensign
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#2c3e50', mt: 0.5 }}>
            {teamEnsignScore}
          </Typography>
        </Box>
      </Box>
      {/* Bandon Dunes Course Score Card */}
      <CourseScoreCard courseName="Bandon Dunes" date="June 5, 2025" teamBoltonTotal={bandonTotals.bolton} teamEnsignTotal={bandonTotals.ensign}>
        {bandonMatches.map((match) => (
          <MatchRow
            key={match.match}
            match={match.match}
            group={match.group}
            time={match.time}
            date={match.date}
            team_bolton={match.team_bolton}
            team_ensign={match.team_ensign}
            winner={match.winner}
          />
        ))}
      </CourseScoreCard>
      {/* Pacific Dunes Course Score Card */}
      <CourseScoreCard courseName="Pacific Dunes" date="June 6, 2025" teamBoltonTotal={pacificTotals.bolton} teamEnsignTotal={pacificTotals.ensign}>
        {pacificMatches.map((match) => (
          <MatchRow
            key={match.match}
            match={match.match}
            group={match.group}
            time={match.time}
            date={match.date}
            team_bolton={match.team_bolton}
            team_ensign={match.team_ensign}
            winner={match.winner}
          />
        ))}
      </CourseScoreCard>
      {/* Old Macdonald Course Score Card */}
      <CourseScoreCard courseName="Old Macdonald" date="June 7, 2025" teamBoltonTotal={oldMacTotals.bolton} teamEnsignTotal={oldMacTotals.ensign}>
        {oldMacMatches.map((match) => (
          <MatchRow
            key={match.match}
            match={match.match}
            group={match.group}
            time={match.time}
            date={match.date}
            team_bolton={match.team_bolton}
            team_ensign={match.team_ensign}
            winner={match.winner}
          />
        ))}
      </CourseScoreCard>
    </Box>
  );
} 