import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getCachedUser, getCachedPlayerProfile } from '@/lib/supabaseServer';
import { canAccessDashboard } from '@/lib/authConfig';
import { calculateMatchHandicapMetrics } from '@/lib/matchHandicapMetrics';
import { getViewerRoleForPendingProposal, isPastScheduledStart } from '@/lib/matchResultEntry';
import DashboardProfileForm from '@/components/player/DashboardProfileForm';
import PlayerMatchResultActions from '@/components/player/PlayerMatchResultActions';
import MatchCard from '@/components/matches/MatchCard';
import LodgingInfoCard from '@/components/player/LodgingInfoCard';
import type { MatchResultsPending } from '@/types/database';
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

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

function ProfileAvatar({
  firstName,
  lastName,
  imageUrl,
  size = 56,
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
      result_set_by_official?: boolean;
      course?: { name?: string | null; slope?: number | null; rating?: number | null; par?: number | null } | null;
    };
    playersByTeam: Map<string, Array<{ id: string; name: string; profileImageUrl: string | null }>>;
    participantPlayerIds: string[];
  };

  let matchesList: DashboardMatch[] = [];
  let pendingByMatchId = new Map<string, MatchResultsPending>();
  let eventTeams: Array<{ id: string; name: string; color: string | null }> = [];
  let handicapByPlayerId = new Map<string, number | null>();
  let myTeamId: string | null = null;
  let isCaptain = false;

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
        .select('player_id, team_id, handicap_at_event')
        .in('team_id', eventTeams.map((team) => team.id));

      handicapByPlayerId = new Map(
        (rosterData || []).map((roster) => [roster.player_id, roster.handicap_at_event ?? null]),
      );
      myTeamId = (rosterData || []).find((roster) => roster.player_id === playerRecord.id)?.team_id ?? null;

      const { data: captainsData } = await supabase
        .from('team_captains')
        .select('player_id')
        .in('team_id', eventTeams.map((team) => team.id));
      isCaptain = (captainsData || []).some((c: { player_id: string }) => c.player_id === playerRecord.id);
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
          'match_id, player:players(id, first_name, last_name, profile_image_url), team:teams(id, name, color), match:matches!inner(id, event_id, match_date, match_time, match_number, match_type, group_number, winner_team_id, is_halved, result_set_by_official, course:courses(name,slope,rating,par))'
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
          participantPlayerIds: [] as string[],
        };
        const playerRow = Array.isArray(row.player) ? row.player[0] : row.player;
        const teamRecord = Array.isArray(row.team) ? row.team[0] : row.team;
        const playerName = playerRow ? `${playerRow.first_name} ${playerRow.last_name}` : 'TBD';
        if (playerRow?.id && !existing.participantPlayerIds.includes(playerRow.id)) {
          existing.participantPlayerIds.push(playerRow.id);
        }
        const teamId = teamRecord?.id;
        if (teamId) {
          const list = existing.playersByTeam.get(teamId) || [];
          list.push({
            id: playerRow?.id || `${row.match_id}-${playerName}`,
            name: playerName,
            profileImageUrl: playerRow?.profile_image_url || null,
          });
          existing.playersByTeam.set(teamId, list);
        }
        matchMap.set(row.match_id, existing);
      });

      const pendingMatchIds = Array.from(matchMap.keys());
      if (pendingMatchIds.length > 0) {
        const { data: pendingRows } = await supabase
          .from('match_results_pending')
          .select('*')
          .in('match_id', pendingMatchIds)
          .eq('status', 'pending');
        pendingByMatchId = new Map(
          (pendingRows || []).map((row) => [row.match_id, row as MatchResultsPending]),
        );
      }

      matchesList = Array.from(matchMap.values()).sort((a, b) => {
        const dateCompare = a.match.match_date.localeCompare(b.match.match_date);
        if (dateCompare !== 0) return dateCompare;
        const timeA = a.match.match_time || '99:99';
        const timeB = b.match.match_time || '99:99';
        return timeA.localeCompare(timeB);
      });
    }
  }

  // "This Trip" record, derived from this event's matches already fetched above -- the
  // same approach as /players/[playerId], not the match_players.is_winner-based aggregate
  // found disabled there (not a safe foundation to build on).
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
  const [teamA, teamB] = eventTeams;

  // "Needs Your Attention" -- reuses the same viewer-role/scheduling utilities
  // PlayerMatchResultActions already uses internally, so a match classified here as
  // needing the player's confirmation is guaranteed to match what that component renders
  // further down the page -- no duplicated business logic, just a page-level summary.
  type AttentionItem =
    | { kind: 'confirm'; matchId: string; matchNumber: number; proposedLabel: string }
    | { kind: 'report'; matchId: string; matchNumber: number; matchDateLabel: string };

  const attentionItems: AttentionItem[] = [];
  if (playerRecord?.id) {
    for (const { match, participantPlayerIds } of matchesList) {
      const pending = pendingByMatchId.get(match.id) ?? null;
      const hasRecordedResult = Boolean(match.winner_team_id) || match.is_halved;
      if (match.result_set_by_official || hasRecordedResult) continue;

      const viewerRole = getViewerRoleForPendingProposal(pending, playerRecord.id, participantPlayerIds);
      if (viewerRole === 'confirmer' && pending) {
        const proposedLabel = pending.is_halved
          ? 'Halved'
          : teamA?.id === pending.winner_team_id
            ? teamA.name
            : teamB?.id === pending.winner_team_id
              ? teamB.name
              : 'Selected team';
        attentionItems.push({
          kind: 'confirm',
          matchId: match.id,
          matchNumber: match.match_number,
          proposedLabel,
        });
      } else if (!pending && isPastScheduledStart(match.match_date, match.match_time)) {
        attentionItems.push({
          kind: 'report',
          matchId: match.id,
          matchNumber: match.match_number,
          matchDateLabel: formatDate(match.match_date),
        });
      }
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
    <div className={styles.root}>
      <div className={styles.container}>
        {playerRecord && (
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
                  firstName={playerRecord.first_name}
                  lastName={playerRecord.last_name}
                  imageUrl={playerRecord.profile_image_url}
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
                  {playerRecord.first_name} {playerRecord.last_name}
                </h1>
              </div>
            </div>

            <div className={styles.statStrip}>
              <div className={styles.statCell}>
                <div className={styles.statValue}>
                  {playerRecord.current_handicap !== null ? playerRecord.current_handicap : '—'}
                </div>
                <div className={styles.statLabel}>GHIN</div>
              </div>
              <div className={styles.statCell}>
                <div className={styles.statValue}>{handicapByPlayerId.get(playerRecord.id) ?? '—'}</div>
                <div className={styles.statLabel}>Event HCP</div>
              </div>
              {thisTripRecord && (
                <div className={styles.statCell}>
                  <div className={styles.statValue}>
                    {thisTripRecord.w}-{thisTripRecord.l}-{thisTripRecord.t}
                  </div>
                  <div className={styles.statLabel}>Event Record</div>
                </div>
              )}
            </div>
          </div>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Needs Your Attention</h2>
          <div className={styles.attentionList}>
            {attentionItems.map((item) => (
              <a key={item.matchId} href={`#match-${item.matchId}`} className={styles.attentionRow}>
                <div className={styles.attentionInfo}>
                  <div className={styles.attentionTitle}>
                    {item.kind === 'confirm' ? 'Confirm result' : 'Report result'} · Match #{item.matchNumber}
                  </div>
                  <div className={styles.attentionMeta}>
                    {item.kind === 'confirm' ? `Proposed: ${item.proposedLabel}` : item.matchDateLabel}
                  </div>
                </div>
                <span className={styles.attentionChevron}>→</span>
              </a>
            ))}
            <Link href="/dashboard/award-nominations" className={styles.attentionRow}>
              <div className={styles.attentionInfo}>
                <div className={styles.attentionTitle}>Ceremony Awards</div>
                <div className={styles.attentionMeta}>Nominate a fellow player for the end-of-trip dinner awards.</div>
              </div>
              <span className={styles.attentionChevron}>→</span>
            </Link>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile Information</h2>
          <p className={styles.sectionSubtitle}>Signed in as {user.email}</p>
          <DashboardProfileForm
            playerId={playerRecord?.id ?? ''}
            firstName={playerRecord?.first_name ?? ''}
            lastName={playerRecord?.last_name ?? ''}
            phone={playerRecord?.phone ?? ''}
            handicap={playerRecord?.current_handicap?.toString() ?? ''}
            ghinNumber={playerRecord?.ghin_number ?? ''}
            ghinClub={playerRecord?.ghin_club ?? ''}
            officialEventHandicap={
              playerRecord?.id ? handicapByPlayerId.get(playerRecord.id) ?? null : null
            }
            profileImageUrl={playerRecord?.profile_image_url ?? ''}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Matches {activeEvent ? `· ${activeEvent.name} ${activeEvent.year}` : ''}
          </h2>
          {matchesList.length === 0 ? (
            <p className={styles.emptyText}>No matches scheduled for you yet.</p>
          ) : (
            <div className={styles.matchList}>
              {matchesList.map(({ match, playersByTeam, participantPlayerIds }) => {
                const teamAPlayers = teamA ? playersByTeam.get(teamA.id) || [] : [];
                const teamBPlayers = teamB ? playersByTeam.get(teamB.id) || [] : [];

                const buildPlayers = (players: Array<{ id: string; name: string; profileImageUrl: string | null }>) =>
                  players.map((player) => ({
                    ...player,
                    officialEventHandicap: handicapByPlayerId.get(player.id) ?? null,
                  }));

                const teamAPlayerCards = buildPlayers(teamAPlayers);
                const teamBPlayerCards = buildPlayers(teamBPlayers);
                const matchPlayerCards = [...teamAPlayerCards, ...teamBPlayerCards];
                const handicapMetricsByPlayerId = calculateMatchHandicapMetrics(
                  matchPlayerCards.map((player) => ({
                    playerId: player.id,
                    officialEventHandicap: player.officialEventHandicap,
                  })),
                  {
                    slope: match.course?.slope ?? null,
                    rating: match.course?.rating ?? null,
                    par: match.course?.par ?? null,
                  },
                );

                const withMetrics = <T extends { id: string; officialEventHandicap: number | null }>(player: T) => {
                  const metrics = handicapMetricsByPlayerId.get(player.id);
                  return {
                    ...player,
                    courseHandicap: metrics?.courseHandicap ?? null,
                    strokesGiven: metrics?.strokesGiven ?? null,
                  };
                };

                return (
                  <div key={match.id} id={`match-${match.id}`} className={styles.matchBlock}>
                    <MatchCard
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
                    {playerRecord?.id ? (
                      <PlayerMatchResultActions
                        matchId={match.id}
                        matchDate={match.match_date}
                        matchTime={match.match_time}
                        teamA={teamA ? { id: teamA.id, name: teamA.name } : null}
                        teamB={teamB ? { id: teamB.id, name: teamB.name } : null}
                        winnerTeamId={match.winner_team_id}
                        isHalved={match.is_halved}
                        resultSetByOfficial={match.result_set_by_official === true}
                        pending={pendingByMatchId.get(match.id) ?? null}
                        currentPlayerId={playerRecord.id}
                        participantPlayerIds={participantPlayerIds}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <LodgingInfoCard
          lodgingInfo={lodgingInfo}
          showConfirmationNumber
          emptyMessage="No room assignment found for you yet."
        />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Re-rounds</h2>
          {reroundsList.length === 0 ? (
            <p className={styles.emptyText}>No re-rounds scheduled for you yet.</p>
          ) : (
            <div className={styles.reroundList}>
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
