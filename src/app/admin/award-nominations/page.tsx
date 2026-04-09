import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { ceremonyAwardLabel } from '@/lib/ceremonyAwards';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { CeremonyAwardKey } from '@/types/database';

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function AdminAwardNominationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: activeEvent } = await supabase
    .from('events')
    .select('id, name, year')
    .eq('is_active', true)
    .maybeSingle();

  if (!activeEvent) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ceremony award nominations
        </Typography>
        <Typography color="text.secondary">No active event. Nominations will appear when an event is active.</Typography>
      </Box>
    );
  }

  const { data: nominations, error } = await supabase
    .from('ceremony_award_nominations')
    .select('id, created_at, award_key, reason, nominator_player_id, nominated_player_id')
    .eq('event_id', activeEvent.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('ceremony_award_nominations', error);
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Typography color="error">Could not load nominations.</Typography>
      </Box>
    );
  }

  const rows = nominations ?? [];
  const playerIds = new Set<string>();
  rows.forEach((r) => {
    playerIds.add(r.nominator_player_id);
    playerIds.add(r.nominated_player_id);
  });

  const { data: players } =
    playerIds.size > 0
      ? await supabase.from('players').select('id, first_name, last_name').in('id', [...playerIds])
      : { data: [] as { id: string; first_name: string; last_name: string }[] };

  const nameById = new Map(
    (players ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`]),
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Ceremony award nominations
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {activeEvent.name} {activeEvent.year} — submissions from players
      </Typography>

      {rows.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">No nominations yet for this event.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="Ceremony award nominations">
            <TableHead>
              <TableRow>
                <TableCell>Submitted</TableCell>
                <TableCell>Award</TableCell>
                <TableCell>Nominator</TableCell>
                <TableCell>Nominee</TableCell>
                <TableCell sx={{ minWidth: 220 }}>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatWhen(row.created_at)}</TableCell>
                  <TableCell>{ceremonyAwardLabel(row.award_key as CeremonyAwardKey)}</TableCell>
                  <TableCell>{nameById.get(row.nominator_player_id) ?? row.nominator_player_id}</TableCell>
                  <TableCell>{nameById.get(row.nominated_player_id) ?? row.nominated_player_id}</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
