import Box from '@mui/material/Box';
import Link from 'next/link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { redirect } from 'next/navigation';
import AwardNominationsForm from '@/app/dashboard/award-nominations/AwardNominationsForm';
import { canAccessDashboard } from '@/lib/authConfig';
import { createSupabaseServerClient, getCachedUser, getCachedPlayerProfile } from '@/lib/supabaseServer';
import styles from './page.module.css';

export default async function AwardNominationsPage() {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login?next=/dashboard/award-nominations');
  }

  const { data: playerRecord, error: playerError } = await getCachedPlayerProfile(user.id);
  if (playerError) {
    console.error('Award nominations: player profile error', playerError);
  }

  const role = playerRecord?.role ?? null;
  if (!canAccessDashboard(role)) {
    redirect('/unauthorized');
  }

  const supabase = await createSupabaseServerClient();
  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name, year')
    .eq('is_active', true)
    .maybeSingle();

  if (!activeEvent) {
    return (
      <Box className={styles.pageRoot}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to dashboard
        </Link>
        <Typography variant="h4" component="h1" className={styles.pageTitle}>
          Ceremony awards
        </Typography>
        <Typography variant="body1" className={styles.subtitle}>
          There is no active event right now. Nominations open when an event is active.
        </Typography>
      </Box>
    );
  }

  const { data: teamRows } = await supabase
    .from('teams')
    .select('id')
    .eq('event_id', activeEvent.id);

  const teamIds = (teamRows || []).map((team) => team.id);
  const participants: Array<{ player_id: string; first_name: string; last_name: string }> = [];

  if (teamIds.length > 0) {
    const { data: rosterRows } = await supabase
      .from('team_rosters')
      .select('player_id, player:players(id, first_name, last_name)')
      .in('team_id', teamIds);

    const seenPlayerIds = new Set<string>();
    for (const row of rosterRows ?? []) {
      const p = Array.isArray(row.player) ? row.player[0] : row.player;
      if (p?.id && !seenPlayerIds.has(row.player_id)) {
        seenPlayerIds.add(row.player_id);
        participants.push({
          player_id: row.player_id,
          first_name: p.first_name,
          last_name: p.last_name,
        });
      }
    }
  }

  const isParticipant = playerRecord?.id
    ? participants.some((p) => p.player_id === playerRecord.id)
    : false;

  const otherNominees = playerRecord?.id
    ? participants.filter((p) => p.player_id !== playerRecord.id)
    : [];

  const eventLabel = `${activeEvent.name} ${activeEvent.year}`;

  return (
    <Box className={styles.pageRoot}>
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to dashboard
      </Link>
      <Typography variant="h4" component="h1" className={styles.pageTitle}>
        Ceremony awards
      </Typography>
      <Typography variant="body1" className={styles.subtitle}>
        Nominate another player for an end-of-trip dinner award. You must be on an event team
        roster for the current event.
      </Typography>

      {!playerRecord?.id ? (
        <Paper elevation={2} className={`${styles.formCard} ${styles.formCardAccent}`}>
          <Typography variant="body1" color="text.secondary">
            Your account is not linked to a player profile yet. Contact the committee if you need
            access.
          </Typography>
        </Paper>
      ) : !isParticipant ? (
        <Paper elevation={2} className={`${styles.formCard} ${styles.formCardAccent}`}>
          <Typography variant="body1" color="text.secondary">
            You are not on a team roster for {eventLabel}. Once you are added to a team roster for
            this event, you can submit nominations here.
          </Typography>
        </Paper>
      ) : otherNominees.length === 0 ? (
        <Paper elevation={2} className={`${styles.formCard} ${styles.formCardAccent}`}>
          <Typography variant="body1" color="text.secondary">
            There are no other rostered players for this event yet, so there is no one to nominate.
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={2} className={`${styles.formCard} ${styles.formCardAccent}`}>
          <Typography variant="h6" className={styles.sectionTitle}>
            Submit a nomination
          </Typography>
          <AwardNominationsForm
            eventId={activeEvent.id}
            eventLabel={eventLabel}
            nominatorPlayerId={playerRecord.id}
            nominees={otherNominees.map((p) => ({
              id: p.player_id,
              first_name: p.first_name,
              last_name: p.last_name,
            }))}
          />
        </Paper>
      )}
    </Box>
  );
}
