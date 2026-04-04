'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { buildEventHandicapsCsv, type HandicapCsvRow } from '@/lib/exportEventHandicapsCsv';
import { sanitizeFilenameSegment } from '@/lib/exportEventMatchesCsv';
import type { Event } from '@/types/database';

type RosterWithJoins = {
  id: string;
  handicap_at_event: number | null;
  player:
    | { first_name: string; last_name: string; ghin_number: string | null; ghin_club: string | null }
    | { first_name: string; last_name: string; ghin_number: string | null; ghin_club: string | null }[]
    | null;
  team: { name: string } | { name: string }[] | null;
};

function normalizeOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default function AdminHandicapsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [rosterRows, setRosterRows] = useState<RosterWithJoins[]>([]);
  const [handicapDrafts, setHandicapDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    const { data, error: evErr } = await supabase.from('events').select('*').order('year', { ascending: false });
    if (evErr) {
      setError(evErr.message);
      return;
    }
    setEvents(data || []);
    setSelectedEventId((prev) => {
      if (prev) return prev;
      if (!data?.length) return '';
      const active = data.find((e) => e.is_active);
      return active?.id ?? data[0].id;
    });
  }, [supabase]);

  const fetchRosters = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    setError(null);

    const { data: teamsData, error: teamsErr } = await supabase
      .from('teams')
      .select('id')
      .eq('event_id', selectedEventId);

    if (teamsErr) {
      setError(teamsErr.message);
      setRosterRows([]);
      setLoading(false);
      return;
    }

    const teamIds = (teamsData || []).map((t) => t.id);
    if (teamIds.length === 0) {
      setRosterRows([]);
      setHandicapDrafts({});
      setLoading(false);
      return;
    }

    const { data: rosterData, error: rosterErr } = await supabase
      .from('team_rosters')
      .select(
        'id, handicap_at_event, player:players(first_name, last_name, ghin_number, ghin_club), team:teams(name)',
      )
      .in('team_id', teamIds)
      .order('id');

    if (rosterErr) {
      setError(rosterErr.message);
      setRosterRows([]);
    } else {
      const rows = (rosterData || []) as RosterWithJoins[];
      setRosterRows(rows);
      const drafts: Record<string, string> = {};
      rows.forEach((r) => {
        drafts[r.id] = r.handicap_at_event != null ? String(r.handicap_at_event) : '';
      });
      setHandicapDrafts(drafts);
    }
    setLoading(false);
  }, [selectedEventId, supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEventId) {
      fetchRosters();
    }
  }, [selectedEventId, fetchRosters]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const csvRows: HandicapCsvRow[] = useMemo(() => {
    return rosterRows.map((r) => {
      const p = normalizeOne(r.player);
      const t = normalizeOne(r.team);
      const name = p ? `${p.first_name} ${p.last_name}`.trim() : 'Unknown';
      return {
        playerName: name,
        teamName: t?.name ?? '',
        officialHandicap: r.handicap_at_event,
        ghinNumber: p?.ghin_number ?? null,
        ghinClub: p?.ghin_club ?? null,
      };
    });
  }, [rosterRows]);

  const handleExportCsv = useCallback(() => {
    if (!selectedEvent) return;
    const csv = buildEventHandicapsCsv(selectedEvent, csvRows);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const base = sanitizeFilenameSegment(`${selectedEvent.name}-${selectedEvent.year}-handicaps`);
    anchor.download = `${base}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [csvRows, selectedEvent]);

  const saveHandicap = async (rosterId: string) => {
    setError(null);
    setSuccess(null);
    const raw = handicapDrafts[rosterId]?.trim() ?? '';
    let value: number | null = null;
    if (raw !== '') {
      const n = parseFloat(raw);
      if (Number.isNaN(n)) {
        setError('Official handicap must be a number or empty.');
        return;
      }
      value = n;
    }

    const { error: upErr } = await supabase.from('team_rosters').update({ handicap_at_event: value }).eq('id', rosterId);

    if (upErr) {
      setError(upErr.message);
      return;
    }
    setSuccess('Handicap updated.');
    fetchRosters();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text)' }}>
          Event handicaps
        </Typography>
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportCsv}
          disabled={!selectedEvent || rosterRows.length === 0}
          sx={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          Export CSV
        </Button>
      </Box>

      <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 2 }}>
        Official handicaps are stored on team rosters for the selected event. GHIN number and club come from each
        player&apos;s profile.
      </Typography>

      <FormControl sx={{ minWidth: 280, mb: 3 }} size="small">
        <InputLabel id="handicaps-event-label">Event</InputLabel>
        <Select
          labelId="handicaps-event-label"
          label="Event"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          {events.map((ev) => (
            <MenuItem key={ev.id} value={ev.id}>
              {ev.name} ({ev.year})
              {ev.is_active ? ' — active' : ''}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper} elevation={2} sx={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, color: 'var(--text)' } }}>
              <TableCell>Player</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Official Event Handicap</TableCell>
              <TableCell>GHIN Number</TableCell>
              <TableCell>GHIN Club</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading…</TableCell>
              </TableRow>
            ) : rosterRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  No roster entries for this event. Add players to teams under Teams management.
                </TableCell>
              </TableRow>
            ) : (
              rosterRows.map((row) => {
                const p = normalizeOne(row.player);
                const t = normalizeOne(row.team);
                const name = p ? `${p.first_name} ${p.last_name}`.trim() : 'Unknown';
                return (
                  <TableRow key={row.id}>
                    <TableCell>{name}</TableCell>
                    <TableCell>{t?.name ?? '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ step: 0.1 }}
                        value={handicapDrafts[row.id] ?? ''}
                        onChange={(e) => setHandicapDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        onBlur={() => saveHandicap(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>{p?.ghin_number ?? '—'}</TableCell>
                    <TableCell>{p?.ghin_club ?? '—'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
