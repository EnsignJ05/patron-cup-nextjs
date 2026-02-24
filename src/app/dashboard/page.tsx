import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getCachedUser, getCachedPlayerProfile } from '@/lib/supabaseServer';
import { canAccessDashboard } from '@/lib/authConfig';
import DashboardProfileForm from '@/components/player/DashboardProfileForm';

// Revalidate every 5 seconds to show updated profile images quickly
export const revalidate = 5;

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return 'TBD';
  const date = new Date(`2000-01-01T${timeStr}`);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default async function DashboardPage() {
  const user = await getCachedUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  // Get player record (which contains the role) - reuses cached data from layout
  const { data: playerRecord, error: playerError } = await getCachedPlayerProfile(user.id);

  console.log('Dashboard page query:', {
    userId: user.id,
    email: user.email,
    playerRecord,
    playerError
  });

  const role = playerRecord?.role ?? null;
  if (!canAccessDashboard(role)) {
    console.log('Redirecting to unauthorized - role check failed:', { role });
    redirect('/unauthorized');
  }

  const supabase = await createSupabaseServerClient();
  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name, year')
    .eq('is_active', true)
    .single();

  type MatchCard = {
    match: {
      id: string;
      match_date: string;
      match_time: string | null;
      match_number: number;
      match_type: string;
      group_number: number | null;
      course?: { name?: string | null } | null;
    };
    players: Array<{ name: string; team?: string | null }>;
  };

  let matchesList: MatchCard[] = [];

  if (playerRecord?.id && activeEvent?.id) {
    const { data: playerMatchIds } = await supabase
      .from('match_players')
      .select('match_id')
      .eq('player_id', playerRecord.id);

    const matchIds = Array.from(new Set((playerMatchIds || []).map((row) => row.match_id))).filter(Boolean);

    if (matchIds.length > 0) {
      const { data: matchPlayers } = await supabase
        .from('match_players')
        .select(
          'match_id, player:players(id, first_name, last_name), team:teams(id, name), match:matches!inner(id, event_id, match_date, match_time, match_number, match_type, group_number, course:courses(name))'
        )
        .in('match_id', matchIds)
        .eq('match.event_id', activeEvent.id);

      const matchMap = new Map<string, MatchCard>();
      (matchPlayers || []).forEach((row) => {
        const matchRecord = Array.isArray(row.match) ? row.match[0] : row.match;
        if (!matchRecord) return;
        const normalizedMatch: MatchCard['match'] = {
          ...matchRecord,
          course: Array.isArray(matchRecord.course) ? matchRecord.course[0] : matchRecord.course,
        };
        const existing = matchMap.get(row.match_id) || {
          match: normalizedMatch,
          players: [] as MatchCard['players'],
        };
        const playerRecord = Array.isArray(row.player) ? row.player[0] : row.player;
        const teamRecord = Array.isArray(row.team) ? row.team[0] : row.team;
        const playerName = playerRecord ? `${playerRecord.first_name} ${playerRecord.last_name}` : 'TBD';
        existing.players.push({ name: playerName, team: teamRecord?.name });
        matchMap.set(row.match_id, existing);
      });

      matchesList = Array.from(matchMap.values()).sort((a, b) => {
        const dateCompare = a.match.match_date.localeCompare(b.match.match_date);
        if (dateCompare !== 0) return dateCompare;
        const timeA = a.match.match_time || '99:99';
        const timeB = b.match.match_time || '99:99';
        return timeA.localeCompare(timeB);
      });
    }
  }

  let reroundsList: Array<{
    id: string;
    reround_date: string;
    reround_time: string | null;
    course?: { name?: string | null } | null;
    player1_id: string | null;
    player2_id: string | null;
    player3_id: string | null;
    player4_id: string | null;
  }> = [];
  let reroundPlayersById = new Map<string, { first_name: string; last_name: string }>();

  if (activeEvent?.id && playerRecord?.id) {
    const { data: rerounds } = await supabase
      .from('rerounds')
      .select('id, reround_date, reround_time, course:courses(name), player1_id, player2_id, player3_id, player4_id')
      .eq('event_id', activeEvent.id)
      .or(
        `player1_id.eq.${playerRecord.id},player2_id.eq.${playerRecord.id},player3_id.eq.${playerRecord.id},player4_id.eq.${playerRecord.id}`
      );

    reroundsList = (rerounds || []).map((reround) => ({
      ...reround,
      course: Array.isArray(reround.course) ? reround.course[0] : reround.course,
    }));

    const playerIds = Array.from(
      new Set(
        reroundsList
          .flatMap((reround) => [
            reround.player1_id,
            reround.player2_id,
            reround.player3_id,
            reround.player4_id,
          ])
          .filter((id): id is string => Boolean(id))
      )
    );

    if (playerIds.length > 0) {
      const { data: reroundPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .in('id', playerIds);

      reroundPlayersById = new Map(
        (reroundPlayers || []).map((player) => [player.id, { first_name: player.first_name, last_name: player.last_name }])
      );
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: { xs: 4, sm: 8 },
        px: { xs: 2, sm: 4 },
      }}
    >
      {playerRecord && (
        <Avatar
          src={playerRecord.profile_image_url || undefined}
          alt={`${playerRecord.first_name} ${playerRecord.last_name}`}
          sx={{
            width: 100,
            height: 100,
            mb: 2,
            fontSize: '2.5rem',
            bgcolor: '#1976d2',
          }}
        >
          {!playerRecord.profile_image_url && `${playerRecord.first_name[0]}${playerRecord.last_name[0]}`}
        </Avatar>
      )}
      
      <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, color: '#2c3e50' }}>
        Player Dashboard
      </Typography>
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, color: '#2c3e50' }}>
          Account details
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
          Signed in as {user.email}
        </Typography>
        {playerRecord && (
          <>
            <Typography variant="body2" sx={{ mb: 1, color: '#666' }}>
              Name: {playerRecord.first_name} {playerRecord.last_name}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, color: '#666' }}>
              Role: {playerRecord.role}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
              Handicap: {playerRecord.current_handicap ?? 'Not set'}
            </Typography>
          </>
        )}
        {!playerRecord && (
          <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
            Player record: Not linked yet.
          </Typography>
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2c3e50' }}>
          Update your profile
        </Typography>
        <DashboardProfileForm
          playerId={playerRecord?.id ?? ''}
          firstName={playerRecord?.first_name ?? ''}
          lastName={playerRecord?.last_name ?? ''}
          phone={playerRecord?.phone ?? ''}
          handicap={playerRecord?.current_handicap?.toString() ?? ''}
          profileImageUrl={playerRecord?.profile_image_url ?? ''}
        />
      </Paper>

      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: 800,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          mt: 4,
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: '#2c3e50' }}>
          {activeEvent ? `${activeEvent.name} ${activeEvent.year}` : 'Current Event'}
        </Typography>

        <Typography variant="h6" sx={{ mb: 1, color: '#2c3e50' }}>
          Matches
        </Typography>
        {matchesList.length === 0 ? (
          <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
            No matches scheduled for you yet.
          </Typography>
        ) : (
          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {matchesList.map(({ match, players }) => (
              <Box key={match.id} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {formatDate(match.match_date)} · {formatTime(match.match_time)} · {match.course?.name || 'Course TBD'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                  Match #{match.match_number} · {match.match_type}
                  {match.group_number !== null && ` · Group ${match.group_number}`}
                </Typography>
                <Typography variant="body2" sx={{ color: '#2c3e50' }}>
                  {players
                    .map((player) => (player.team ? `${player.name} (${player.team})` : player.name))
                    .join(', ')}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Typography variant="h6" sx={{ mb: 1, color: '#2c3e50' }}>
          Re-rounds
        </Typography>
        {reroundsList.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#666' }}>
            No re-rounds scheduled for you yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {reroundsList.map((reround) => {
              const playerNames = [
                reround.player1_id,
                reround.player2_id,
                reround.player3_id,
                reround.player4_id,
              ]
                .map((playerId) => {
                  if (!playerId) return 'TBD';
                  const player = reroundPlayersById.get(playerId);
                  return player ? `${player.first_name} ${player.last_name}` : 'TBD';
                })
                .join(', ');

              return (
                <Box key={reround.id} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {formatDate(reround.reround_date)} · {formatTime(reround.reround_time)} ·{' '}
                    {reround.course?.name || 'Course TBD'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#2c3e50' }}>
                    {playerNames}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
