import Image from 'next/image';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { calculateMatchHandicapMetrics } from '@/lib/matchHandicapMetrics';
import { notFound } from 'next/navigation';
import DashboardProfileForm from '@/components/player/DashboardProfileForm';
import MatchCard from '@/components/matches/MatchCard';
import LodgingInfoCard from '@/components/player/LodgingInfoCard';
import styles from './page.module.css';

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

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

function ProfileAvatar({
  firstName,
  lastName,
  imageUrl,
  size = 64,
}: {
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  size?: number;
}) {
  const name = `${firstName} ${lastName}`;
  if (imageUrl) {
    return (
      <div className={styles.avatarImgWrap} style={{ width: size, height: size }}>
        <Image src={imageUrl} alt={name} width={size} height={size} style={{ objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div className={styles.avatar} style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}>
      {getInitials(firstName, lastName)}
    </div>
  );
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ playerId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { playerId } = await params;

  // Get the player info
  // Explicit columns, not '*': this route is gated behind auth (see S3 in
  // TEST_ENVIRONMENT_PLAN.md Part II), so it may read private fields the public-safe
  // list (src/lib/playerColumns.ts) excludes -- but every column read here must still be
  // deliberate, not a blanket '*'.
  const { data: player, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, phone, current_handicap, ghin_number, ghin_club, profile_image_url')
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
      course?: { name?: string | null; slope?: number | null; rating?: number | null; par?: number | null } | null;
    };
    playersByTeam: Map<string, Array<{ id: string; name: string; profileImageUrl: string | null }>>;
  };

  let matchesList: PlayerDashboardMatch[] = [];
  let eventTeams: Array<{ id: string; name: string; color: string | null }> = [];
  let handicapByPlayerId = new Map<string, number | null>();
  let myTeamId: string | null = null;
  let isCaptain = false;

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
        .select('player_id, team_id, handicap_at_event')
        .in('team_id', eventTeams.map((team) => team.id));

      handicapByPlayerId = new Map(
        (rosterData || []).map((roster) => [roster.player_id, roster.handicap_at_event ?? null]),
      );
      myTeamId = (rosterData || []).find((roster) => roster.player_id === playerId)?.team_id ?? null;

      const { data: captainsData } = await supabase
        .from('team_captains')
        .select('player_id')
        .in('team_id', eventTeams.map((team) => team.id));
      isCaptain = (captainsData || []).some((c: { player_id: string }) => c.player_id === playerId);
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
          'match_id, player:players(id, first_name, last_name, profile_image_url), team:teams(id, name, color), match:matches!inner(id, event_id, match_date, match_time, match_number, match_type, group_number, winner_team_id, is_halved, course:courses(name,slope,rating,par))'
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

  // "This Trip" record, derived from this event's matches already fetched above -- not the
  // match_players.is_winner-based aggregate found disabled elsewhere (see memory: that one
  // isn't a safe foundation to build on). Counts only matches with a recorded result.
  let thisTripRecord: { w: number; l: number; t: number } | null = null;
  if (myTeamId) {
    let w = 0;
    let l = 0;
    let t = 0;
    for (const { match } of matchesList) {
      if (match.is_halved) t++;
      else if (match.winner_team_id === myTeamId) w++;
      else if (match.winner_team_id) l++;
    }
    if (w + l + t > 0) thisTripRecord = { w, l, t };
  }

  const myTeam = eventTeams.find((team) => team.id === myTeamId) ?? null;
  const teamColor = myTeam ? myTeam.color || (eventTeams[0]?.id === myTeam.id ? 'var(--pc-team-a)' : 'var(--pc-team-b)') : null;

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
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.hero} style={teamColor ? { borderBottomColor: teamColor } : undefined}>
          {teamColor && (
            <div
              className={styles.heroGlow}
              style={{ background: `linear-gradient(135deg, transparent 30%, ${teamColor} 130%)` }}
            />
          )}
          <div className={styles.heroRow}>
            <div className={styles.avatarWrap}>
              <ProfileAvatar
                firstName={player.first_name}
                lastName={player.last_name}
                imageUrl={player.profile_image_url}
                size={64}
              />
              {teamColor && <span className={styles.teamChip} style={{ background: teamColor }} />}
            </div>
            <div className={styles.heroInfo}>
              <div className={styles.heroBadges}>
                {myTeam && (
                  <span className={styles.teamLabel} style={{ color: teamColor ?? undefined }}>
                    Team {myTeam.name}
                  </span>
                )}
                {isCaptain && (
                  <span className={styles.captBadge} style={{ background: teamColor ?? undefined }}>
                    ★ Captain
                  </span>
                )}
              </div>
              <h1 className={styles.displayName}>
                {player.first_name} {player.last_name}
              </h1>
            </div>
          </div>

          <div className={styles.statStrip}>
            <div className={styles.statCell}>
              <div className={styles.statValue}>
                {player.current_handicap !== null ? player.current_handicap.toFixed(1) : '—'}
              </div>
              <div className={styles.statLabel}>HCP</div>
            </div>
            {thisTripRecord && (
              <div className={styles.statCell}>
                <div className={styles.statValue}>
                  {thisTripRecord.w}-{thisTripRecord.l}-{thisTripRecord.t}
                </div>
                <div className={styles.statLabel}>
                  This Trip{activeEvent ? ` · ${activeEvent.year}` : ''}
                </div>
              </div>
            )}
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile Information</h2>
          <DashboardProfileForm
            playerId={player.id}
            firstName={player.first_name}
            lastName={player.last_name}
            phone={player.phone ?? ''}
            handicap={player.current_handicap?.toString() ?? ''}
            ghinNumber={player.ghin_number ?? ''}
            ghinClub={player.ghin_club ?? ''}
            officialEventHandicap={handicapByPlayerId.get(player.id) ?? null}
            profileImageUrl={player.profile_image_url ?? ''}
            readOnly={!canEdit}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Matches {activeEvent ? `· ${activeEvent.name} ${activeEvent.year}` : ''}
          </h2>
          {matchesList.length === 0 ? (
            <p className={styles.emptyText}>No matches scheduled for this player yet.</p>
          ) : (
            <div className={styles.matchList}>
              {matchesList.map(({ match, playersByTeam }) => {
                const [teamA, teamB] = eventTeams;
                const teamAPlayers = teamA ? playersByTeam.get(teamA.id) || [] : [];
                const teamBPlayers = teamB ? playersByTeam.get(teamB.id) || [] : [];

                const buildPlayers = (playersForTeam: Array<{ id: string; name: string; profileImageUrl: string | null }>) =>
                  playersForTeam.map((matchPlayer) => ({
                    ...matchPlayer,
                    officialEventHandicap: handicapByPlayerId.get(matchPlayer.id) ?? null,
                  }));

                const teamAPlayerCards = buildPlayers(teamAPlayers);
                const teamBPlayerCards = buildPlayers(teamBPlayers);
                const matchPlayerCards = [...teamAPlayerCards, ...teamBPlayerCards];
                const handicapMetricsByPlayerId = calculateMatchHandicapMetrics(
                  matchPlayerCards.map((matchPlayer) => ({
                    playerId: matchPlayer.id,
                    officialEventHandicap: matchPlayer.officialEventHandicap,
                  })),
                  {
                    slope: match.course?.slope ?? null,
                    rating: match.course?.rating ?? null,
                    par: match.course?.par ?? null,
                  },
                );

                const withMetrics = <T extends { id: string; officialEventHandicap: number | null }>(matchPlayer: T) => {
                  const metrics = handicapMetricsByPlayerId.get(matchPlayer.id);
                  return {
                    ...matchPlayer,
                    courseHandicap: metrics?.courseHandicap ?? null,
                    strokesGiven: metrics?.strokesGiven ?? null,
                  };
                };

                return (
                  <MatchCard
                    key={match.id}
                    matchNumber={match.match_number}
                    matchType={match.match_type}
                    teeTime={formatTime(match.match_time)}
                    matchDateLabel={formatDate(match.match_date)}
                    courseLabel={match.course?.name ?? 'Course TBD'}
                    winnerTeamId={match.winner_team_id}
                    isHalved={match.is_halved}
                    teamA={
                      teamA
                        ? {
                            id: teamA.id,
                            name: teamA.name,
                            color: teamA.color,
                            players: teamAPlayerCards.map(withMetrics),
                          }
                        : null
                    }
                    teamB={
                      teamB
                        ? {
                            id: teamB.id,
                            name: teamB.name,
                            color: teamB.color,
                            players: teamBPlayerCards.map(withMetrics),
                          }
                        : null
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        <LodgingInfoCard
          lodgingInfo={lodgingInfo}
          emptyMessage="No room assignment found for this player yet."
        />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Re-Rounds {activeEvent ? `· ${activeEvent.name} ${activeEvent.year}` : ''}
          </h2>
          {reroundsList.length === 0 ? (
            <p className={styles.emptyText}>No re-rounds scheduled for this player yet.</p>
          ) : (
            <div className={styles.reroundList}>
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
                  <div key={reround.id} className={styles.reroundItem}>
                    <div className={styles.reroundTitle}>
                      {formatDate(reround.reround_date)} · {formatTime(reround.reround_time)} ·{' '}
                      {reround.course?.name || 'Course TBD'}
                    </div>
                    <div className={styles.reroundPlayers}>{playerNames}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
