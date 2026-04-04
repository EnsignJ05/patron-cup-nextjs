import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getCachedUser, getCachedPlayerProfile } from '@/lib/supabaseServer';
import { canAccessDashboard } from '@/lib/authConfig';
import DashboardProfileForm from '@/components/player/DashboardProfileForm';
import MatchCard from '@/components/matches/MatchCard';
import LodgingInfoCard from '@/components/player/LodgingInfoCard';
import styles from './page.module.css';

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
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const date = new Date(`2000-01-01T${normalized}`);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

  type DashboardMatch = {
    match: {
      id: string;
      match_date: string;
      match_time: string | null;
      match_number: number;
      match_type: string;
      group_number: number | null;
      winner_team_id: string | null;
      is_halved: boolean;
      course?: { name?: string | null } | null;
    };
    playersByTeam: Map<string, Array<{ id: string; name: string; profileImageUrl: string | null }>>;
  };

  let matchesList: DashboardMatch[] = [];
  let eventTeams: Array<{ id: string; name: string; color: string | null }> = [];
  let handicapByPlayerId = new Map<string, number | null>();

  if (playerRecord?.id && activeEvent?.id) {
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, color')
      .eq('event_id', activeEvent.id)
      .order('name');

    eventTeams = teamsData || [];

    if (eventTeams.length > 0) {
      const { data: rosterData } = await supabase
        .from('team_rosters')
        .select('player_id, handicap_at_event')
        .in('team_id', eventTeams.map((team) => team.id));

      handicapByPlayerId = new Map(
        (rosterData || []).map((roster) => [roster.player_id, roster.handicap_at_event ?? null]),
      );
    }

    const { data: playerMatchIds } = await supabase
      .from('match_players')
      .select('match_id')
      .eq('player_id', playerRecord.id);

    const matchIds = Array.from(new Set((playerMatchIds || []).map((row) => row.match_id))).filter(Boolean);

    if (matchIds.length > 0) {
      const { data: matchPlayers } = await supabase
        .from('match_players')
        .select(
          'match_id, player:players(id, first_name, last_name, profile_image_url), team:teams(id, name, color), match:matches!inner(id, event_id, match_date, match_time, match_number, match_type, group_number, winner_team_id, is_halved, course:courses(name))'
        )
        .in('match_id', matchIds)
        .eq('match.event_id', activeEvent.id);

      const matchMap = new Map<string, DashboardMatch>();
      (matchPlayers || []).forEach((row) => {
        const matchRecord = Array.isArray(row.match) ? row.match[0] : row.match;
        if (!matchRecord) return;
        const normalizedMatch: DashboardMatch['match'] = {
          ...matchRecord,
          course: Array.isArray(matchRecord.course) ? matchRecord.course[0] : matchRecord.course,
        };
        const existing = matchMap.get(row.match_id) || {
          match: normalizedMatch,
          playersByTeam: new Map<string, Array<{ id: string; name: string; profileImageUrl: string | null }>>(),
        };
        const playerRecord = Array.isArray(row.player) ? row.player[0] : row.player;
        const teamRecord = Array.isArray(row.team) ? row.team[0] : row.team;
        const playerName = playerRecord ? `${playerRecord.first_name} ${playerRecord.last_name}` : 'TBD';
        const teamId = teamRecord?.id;
        if (teamId) {
          const list = existing.playersByTeam.get(teamId) || [];
          list.push({
            id: playerRecord?.id || `${row.match_id}-${playerName}`,
            name: playerName,
            profileImageUrl: playerRecord?.profile_image_url || null,
          });
          existing.playersByTeam.set(teamId, list);
        }
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
  let lodgingInfo: {
    buildingName: string | null;
    roomNumber: string | null;
    roomType: string | null;
    confirmationNum: string | null;
    roommates: Array<{ id: string; name: string }>;
  } | null = null;

  if (activeEvent?.id && playerRecord?.id) {
    const { data: myLodgingAssignment } = await supabase
      .from('lodging_assignments')
      .select('id, player_id, lodging_id, confirmation_num, lodging:lodging!inner(id, event_id, building_name, room_number, room_type)')
      .eq('player_id', playerRecord.id)
      .eq('lodging.event_id', activeEvent.id)
      .limit(1)
      .maybeSingle();

    const lodgingRecord = myLodgingAssignment?.lodging;
    const normalizedLodging = Array.isArray(lodgingRecord) ? lodgingRecord[0] : lodgingRecord;

    if (myLodgingAssignment?.lodging_id && normalizedLodging) {
      const { data: roommateAssignments } = await supabase
        .from('lodging_assignments')
        .select('player_id, player:players(first_name, last_name)')
        .eq('lodging_id', myLodgingAssignment.lodging_id)
        .neq('player_id', playerRecord.id);

      const roommateNames = (roommateAssignments || [])
        .map((assignment) => {
          const roommate = Array.isArray(assignment.player) ? assignment.player[0] : assignment.player;
          if (!roommate) return null;
          return { id: assignment.player_id, name: `${roommate.first_name} ${roommate.last_name}` };
        })
        .filter((roommate): roommate is { id: string; name: string } => Boolean(roommate));

      lodgingInfo = {
        buildingName: normalizedLodging.building_name ?? null,
        roomNumber: normalizedLodging.room_number ?? null,
        roomType: normalizedLodging.room_type ?? null,
        confirmationNum: myLodgingAssignment.confirmation_num ?? null,
        roommates: roommateNames,
      };
    }
  }

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
    <Box className={styles.pageRoot}>
      {playerRecord && (
        <Avatar
          src={playerRecord.profile_image_url || undefined}
          alt={`${playerRecord.first_name} ${playerRecord.last_name}`}
          className={styles.avatar}
          sx={{
            width: 'min(320px, calc(100vw - 32px))',
            height: 'min(320px, calc(100vw - 32px))',
          }}
        >
          {!playerRecord.profile_image_url && `${playerRecord.first_name[0]}${playerRecord.last_name[0]}`}
        </Avatar>
      )}
      
      <Typography variant="h3" className={styles.pageTitle}>
        Player Dashboard
      </Typography>
      <Paper
        elevation={2}
        className={`${styles.profileCard} ${styles.profileCardAccent}`}
      >
        <Typography variant="h6" className={styles.sectionTitle}>
          Account details
        </Typography>
        <Typography variant="body2" className={styles.sectionSubtitle}>
          Signed in as {user.email}
        </Typography>
        {playerRecord && (
          <>
            <Typography variant="body2" className={styles.detailText}>
              Name: {playerRecord.first_name} {playerRecord.last_name}
            </Typography>
            <Typography variant="body2" className={styles.detailText}>
              Role: {playerRecord.role}
            </Typography>
            <Typography variant="body2" className={styles.detailTextWide}>
              Handicap: {playerRecord.current_handicap ?? 'Not set'}
            </Typography>
          </>
        )}
        {!playerRecord && (
          <Typography variant="body2" className={styles.detailTextWide}>
            Player record: Not linked yet.
          </Typography>
        )}
        <Typography variant="subtitle1" className={styles.sectionSubtitleStrong}>
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
        className={`${styles.matchesCard} ${styles.matchesCardAccent}`}
      >
        <Typography variant="h5" className={styles.sectionHeading}>
          {activeEvent ? `${activeEvent.name} ${activeEvent.year}` : 'Current Event'}
        </Typography>

        <Typography variant="h6" className={styles.sectionTitle}>
          Matches
        </Typography>
        {matchesList.length === 0 ? (
          <Typography variant="body2" className={styles.detailTextWide}>
            No matches scheduled for you yet.
          </Typography>
        ) : (
          <Box className={styles.matchList}>
            {matchesList.map(({ match, playersByTeam }) => {
              const [teamA, teamB] = eventTeams;
              const teamAPlayers = teamA ? playersByTeam.get(teamA.id) || [] : [];
              const teamBPlayers = teamB ? playersByTeam.get(teamB.id) || [] : [];

              const buildPlayers = (players: Array<{ id: string; name: string; profileImageUrl: string | null }>) =>
                players.map((player) => ({
                  ...player,
                  handicap: handicapByPlayerId.get(player.id) ?? null,
                }));

              return (
                <MatchCard
                  key={match.id}
                  matchNumber={match.match_number}
                  matchType={match.match_type}
                  teeTime={formatTime(match.match_time)}
                  winnerTeamId={match.winner_team_id}
                  isHalved={match.is_halved}
                  teamA={
                    teamA
                      ? {
                          id: teamA.id,
                          name: teamA.name,
                          color: teamA.color,
                          players: buildPlayers(teamAPlayers),
                        }
                      : null
                  }
                  teamB={
                    teamB
                      ? {
                          id: teamB.id,
                          name: teamB.name,
                          color: teamB.color,
                          players: buildPlayers(teamBPlayers),
                        }
                      : null
                  }
                />
              );
            })}
          </Box>
        )}

      </Paper>

      <LodgingInfoCard
        lodgingInfo={lodgingInfo}
        showConfirmationNumber
        cardClassName={styles.lodgingCard}
        emptyMessage="No room assignment found for you yet."
      />

      <Paper
        elevation={2}
        className={`${styles.reroundsCard} ${styles.reroundsCardAccent}`}
      >
        <Typography variant="h6" className={styles.sectionTitle}>
          Re-rounds
        </Typography>
        {reroundsList.length === 0 ? (
          <Typography variant="body2" className={styles.detailText}>
            No re-rounds scheduled for you yet.
          </Typography>
        ) : (
          <Box className={styles.reroundList}>
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
                <Box key={reround.id} className={styles.reroundItem}>
                  <Typography variant="subtitle1" className={styles.matchTitle}>
                    {formatDate(reround.reround_date)} · {formatTime(reround.reround_time)} ·{' '}
                    {reround.course?.name || 'Course TBD'}
                  </Typography>
                  <Typography variant="body2" className={styles.matchPlayers}>
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
