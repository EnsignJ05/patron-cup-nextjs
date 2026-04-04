import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import DashboardProfileForm from '@/components/player/DashboardProfileForm';
import MatchCard from '@/components/matches/MatchCard';
import LodgingInfoCard from '@/components/player/LodgingInfoCard';
import styles from './page.module.css';
// import PlayerRerounds from '@/components/player/PlayerRerounds';
// import PlayerStats from '@/components/player/PlayerStats';

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
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default async function PlayerProfilePage({ params }: { params: Promise<{ playerId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { playerId } = await params;
  
  // Get the player info
  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    notFound();
  }

  // Check if current user can edit this profile
  const { data } = await supabase.auth.getUser();
  const currentUser = data?.user;
  
  let canEdit = false;
  if (currentUser) {
    // Get current user's player record
    const { data: currentPlayerRecord } = await supabase
      .from('players')
      .select('id, role, auth_user_id')
      .eq('auth_user_id', currentUser.id)
      .single();

    // Can edit if: same player or admin
    canEdit = 
      currentPlayerRecord?.id === player.id || 
      currentPlayerRecord?.role === 'admin';
  }

  // Calculate player's record from match_players (disabled for now)
  // const { data: matchPlayers } = await supabase
  //   .from('match_players')
  //   .select('is_winner, match:matches(is_halved)')
  //   .eq('player_id', playerId);
  //
  // let wins = 0;
  // let losses = 0;
  // let ties = 0;
  //
  // if (matchPlayers) {
  //   matchPlayers.forEach((mp: any) => {
  //     if (mp.match?.is_halved) {
  //       ties++;
  //     } else if (mp.is_winner) {
  //       wins++;
  //     } else {
  //       losses++;
  //     }
  //   });
  // }
  //
  // const record = { wins, losses, ties };

  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name, year')
    .eq('is_active', true)
    .single();

  type PlayerDashboardMatch = {
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

  let matchesList: PlayerDashboardMatch[] = [];
  let eventTeams: Array<{ id: string; name: string; color: string | null }> = [];
  let handicapByPlayerId = new Map<string, number | null>();

  if (activeEvent?.id) {
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
      .eq('player_id', playerId);

    const matchIds = Array.from(new Set((playerMatchIds || []).map((row) => row.match_id))).filter(Boolean);

    if (matchIds.length > 0) {
      const { data: matchPlayers } = await supabase
        .from('match_players')
        .select(
          'match_id, player:players(id, first_name, last_name, profile_image_url), team:teams(id, name, color), match:matches!inner(id, event_id, match_date, match_time, match_number, match_type, group_number, winner_team_id, is_halved, course:courses(name))'
        )
        .in('match_id', matchIds)
        .eq('match.event_id', activeEvent.id);

      const matchMap = new Map<string, PlayerDashboardMatch>();
      (matchPlayers || []).forEach((row) => {
        const matchRecord = Array.isArray(row.match) ? row.match[0] : row.match;
        if (!matchRecord) return;
        const normalizedMatch: PlayerDashboardMatch['match'] = {
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

  let lodgingInfo: {
    buildingName: string | null;
    roomNumber: string | null;
    roomType: string | null;
    roommates: Array<{ id: string; name: string }>;
  } | null = null;

  if (activeEvent?.id) {
    const { data: myLodgingAssignment } = await supabase
      .from('lodging_assignments')
      .select('id, player_id, lodging_id, confirmation_num, lodging:lodging!inner(id, event_id, building_name, room_number, room_type)')
      .eq('player_id', playerId)
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
        .neq('player_id', playerId);

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
        roommates: roommateNames,
      };
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

  if (activeEvent?.id) {
    const { data: rerounds } = await supabase
      .from('rerounds')
      .select('id, reround_date, reround_time, course:courses(name), player1_id, player2_id, player3_id, player4_id')
      .eq('event_id', activeEvent.id)
      .or(
        `player1_id.eq.${playerId},player2_id.eq.${playerId},player3_id.eq.${playerId},player4_id.eq.${playerId}`
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
      <Avatar
        src={player.profile_image_url || undefined}
        alt={`${player.first_name} ${player.last_name}`}
        className={styles.avatar}
        sx={{
          width: 'min(320px, calc(100vw - 32px))',
          height: 'min(320px, calc(100vw - 32px))',
        }}
      >
        {!player.profile_image_url && `${player.first_name[0]}${player.last_name[0]}`}
      </Avatar>

      <Typography variant="h3" className={styles.pageTitle}>
        {player.first_name} {player.last_name}
      </Typography>

      <Paper
        elevation={2}
        className={`${styles.profileCard} ${styles.profileCardAccent}`}
      >
        <Typography variant="h6" className={styles.sectionTitle}>
          Profile Information
        </Typography>
        
        <DashboardProfileForm
          playerId={player.id}
          firstName={player.first_name}
          lastName={player.last_name}
          phone={player.phone ?? ''}
          handicap={player.current_handicap?.toString() ?? ''}
          profileImageUrl={player.profile_image_url ?? ''}
          readOnly={!canEdit}
        />
      </Paper>

      <Paper
        elevation={2}
        className={`${styles.matchesCard} ${styles.matchesCardAccent}`}
      >
        <Typography variant="h6" className={styles.sectionTitle}>
          Matches {activeEvent ? `· ${activeEvent.name} ${activeEvent.year}` : ''}
        </Typography>
        {matchesList.length === 0 ? (
          <Typography variant="body2" className={styles.emptyText}>
            No matches scheduled for this player yet.
          </Typography>
        ) : (
          <Box className={styles.matchList}>
            {matchesList.map(({ match, playersByTeam }) => {
              const [teamA, teamB] = eventTeams;
              const teamAPlayers = teamA ? playersByTeam.get(teamA.id) || [] : [];
              const teamBPlayers = teamB ? playersByTeam.get(teamB.id) || [] : [];

              const buildPlayers = (playersForTeam: Array<{ id: string; name: string; profileImageUrl: string | null }>) =>
                playersForTeam.map((matchPlayer) => ({
                  ...matchPlayer,
                  handicap: handicapByPlayerId.get(matchPlayer.id) ?? null,
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
        cardClassName={`${styles.lodgingCard} ${styles.lodgingCardAccent}`}
        emptyMessage="No room assignment found for this player yet."
      />

      {/* Player Rerounds */}
      <Paper
        elevation={2}
        className={`${styles.reroundsCard} ${styles.reroundsCardAccent}`}
      >
        <Typography variant="h6" className={styles.sectionTitle}>
          Re-Rounds {activeEvent ? `· ${activeEvent.name} ${activeEvent.year}` : ''}
        </Typography>
        {reroundsList.length === 0 ? (
          <Typography variant="body2" className={styles.emptyText}>
            No re-rounds scheduled for this player yet.
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
                .map((id) => {
                  if (!id) return 'TBD';
                  const reroundPlayer = reroundPlayersById.get(id);
                  return reroundPlayer ? `${reroundPlayer.first_name} ${reroundPlayer.last_name}` : 'TBD';
                })
                .join(', ');

              return (
                <Box key={reround.id} className={styles.reroundItem}>
                  <Typography variant="subtitle1" className={styles.reroundTitle}>
                    {formatDate(reround.reround_date)} · {formatTime(reround.reround_time)} ·{' '}
                    {reround.course?.name || 'Course TBD'}
                  </Typography>
                  <Typography variant="body2" className={styles.reroundPlayers}>
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
