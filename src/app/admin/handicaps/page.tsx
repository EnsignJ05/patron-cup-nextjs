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
import TableSortLabel from '@mui/material/TableSortLabel';
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
import { calculateCourseHandicap } from '@/lib/courseHandicap';
import type { Course, Event } from '@/types/database';

type SortKey = 'firstName' | 'lastName' | 'team' | 'handicap' | 'ghinNumber' | 'ghinClub';
type SortDir = 'asc' | 'desc';

function normalizeGhinNumber(s: string): string | null {
  const t = s.trim().slice(0, 32);
  return t === '' ? null : t;
}

function normalizeGhinClub(s: string): string | null {
  const t = s.trim().slice(0, 80);
  return t === '' ? null : t;
}

type RosterWithJoins = {
  id: string;
  player_id: string;
  handicap_at_event: number | null;
  player:
    | { first_name: string; last_name: string; ghin_number: string | null; ghin_club: string | null }
    | { first_name: string; last_name: string; ghin_number: string | null; ghin_club: string | null }[]
    | null;
  team: { name: string } | { name: string }[] | null;
};

type EventCourse = Pick<Course, 'id' | 'name' | 'par' | 'rating' | 'slope'>;

function normalizeOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default function AdminHandicapsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [rosterRows, setRosterRows] = useState<RosterWithJoins[]>([]);
  const [eventCourses, setEventCourses] = useState<EventCourse[]>([]);
  const [handicapDrafts, setHandicapDrafts] = useState<Record<string, string>>({});
  const [ghinDrafts, setGhinDrafts] = useState<Record<string, { ghinNumber: string; ghinClub: string }>>({});
  const [sortKey, setSortKey] = useState<SortKey>('lastName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
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

    const [{ data: teamsData, error: teamsErr }, { data: coursesData, error: coursesErr }] = await Promise.all([
      supabase.from('teams').select('id').eq('event_id', selectedEventId),
      supabase
        .from('courses')
        .select('id, name, par, rating, slope')
        .eq('event_id', selectedEventId)
        .order('name', { ascending: true }),
    ]);

    if (coursesErr) {
      setError(coursesErr.message);
      setEventCourses([]);
    } else {
      setEventCourses((coursesData as EventCourse[]) ?? []);
    }

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
      setGhinDrafts({});
      setLoading(false);
      return;
    }

    const { data: rosterData, error: rosterErr } = await supabase
      .from('team_rosters')
      .select(
        'id, player_id, handicap_at_event, player:players(first_name, last_name, ghin_number, ghin_club), team:teams(name)',
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
      const ghin: Record<string, { ghinNumber: string; ghinClub: string }> = {};
      rows.forEach((r) => {
        drafts[r.id] = r.handicap_at_event != null ? String(r.handicap_at_event) : '';
        const pl = normalizeOne(r.player);
        ghin[r.id] = {
          ghinNumber: pl?.ghin_number ?? '',
          ghinClub: pl?.ghin_club ?? '',
        };
      });
      setHandicapDrafts(drafts);
      setGhinDrafts(ghin);
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
  const totalColumns = 6 + eventCourses.length;

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortDir('asc');
      }
      return key;
    });
  }, []);

  const sortedRosterRows = useMemo(() => {
    const rows = [...rosterRows];
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const pa = normalizeOne(a.player);
      const pb = normalizeOne(b.player);
      const ta = normalizeOne(a.team);
      const tb = normalizeOne(b.team);
      switch (sortKey) {
        case 'firstName':
          return (
            (pa?.first_name ?? '').localeCompare(pb?.first_name ?? '', undefined, { sensitivity: 'base' }) * dir
          );
        case 'lastName':
          return (
            (pa?.last_name ?? '').localeCompare(pb?.last_name ?? '', undefined, { sensitivity: 'base' }) * dir
          );
        case 'team':
          return (ta?.name ?? '').localeCompare(tb?.name ?? '', undefined, { sensitivity: 'base' }) * dir;
        case 'handicap': {
          const ha = a.handicap_at_event;
          const hb = b.handicap_at_event;
          if (ha == null && hb == null) return 0;
          if (ha == null) return 1 * dir;
          if (hb == null) return -1 * dir;
          return (ha - hb) * dir;
        }
        case 'ghinNumber':
          return (
            (pa?.ghin_number ?? '').localeCompare(pb?.ghin_number ?? '', undefined, { sensitivity: 'base' }) * dir
          );
        case 'ghinClub':
          return (
            (pa?.ghin_club ?? '').localeCompare(pb?.ghin_club ?? '', undefined, { sensitivity: 'base' }) * dir
          );
        default:
          return 0;
      }
    });
    return rows;
  }, [rosterRows, sortKey, sortDir]);

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

  const saveGhin = async (rosterId: string, playerId: string) => {
    setError(null);
    setSuccess(null);
    const draft = ghinDrafts[rosterId];
    if (!draft) return;

    const ghinNumber = normalizeGhinNumber(draft.ghinNumber);
    const ghinClub = normalizeGhinClub(draft.ghinClub);

    const row = rosterRows.find((r) => r.id === rosterId);
    const p = row ? normalizeOne(row.player) : null;
    const curNum = normalizeGhinNumber(String(p?.ghin_number ?? ''));
    const curClub = normalizeGhinClub(String(p?.ghin_club ?? ''));
    if (ghinNumber === curNum && ghinClub === curClub) return;

    const { error: upErr } = await supabase
      .from('players')
      .update({ ghin_number: ghinNumber, ghin_club: ghinClub })
      .eq('id', playerId);

    if (upErr) {
      setError(upErr.message);
      return;
    }
    setSuccess('GHIN details updated.');
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
        Official handicaps are stored on team rosters for the selected event. GHIN number and club are stored on each
        player&apos;s profile and can be edited here. Course handicaps are computed as round(HI * (slope/113) +
        (rating - par)).
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
            <TableRow
              sx={{
                '& th': { fontWeight: 600, color: 'var(--text)' },
                '& .MuiTableSortLabel-root': { color: 'var(--text)' },
                '& .MuiTableSortLabel-icon': { color: 'var(--text-muted)' },
              }}
            >
              <TableCell sortDirection={sortKey === 'firstName' ? sortDir : false}>
                <TableSortLabel
                  active={sortKey === 'firstName'}
                  direction={sortKey === 'firstName' ? sortDir : 'asc'}
                  onClick={() => handleSort('firstName')}
                >
                  First name
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortKey === 'lastName' ? sortDir : false}>
                <TableSortLabel
                  active={sortKey === 'lastName'}
                  direction={sortKey === 'lastName' ? sortDir : 'asc'}
                  onClick={() => handleSort('lastName')}
                >
                  Last name
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortKey === 'team' ? sortDir : false}>
                <TableSortLabel
                  active={sortKey === 'team'}
                  direction={sortKey === 'team' ? sortDir : 'asc'}
                  onClick={() => handleSort('team')}
                >
                  Team
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortKey === 'handicap' ? sortDir : false}>
                <TableSortLabel
                  active={sortKey === 'handicap'}
                  direction={sortKey === 'handicap' ? sortDir : 'asc'}
                  onClick={() => handleSort('handicap')}
                >
                  Official event handicap
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortKey === 'ghinNumber' ? sortDir : false}>
                <TableSortLabel
                  active={sortKey === 'ghinNumber'}
                  direction={sortKey === 'ghinNumber' ? sortDir : 'asc'}
                  onClick={() => handleSort('ghinNumber')}
                >
                  GHIN number
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortKey === 'ghinClub' ? sortDir : false}>
                <TableSortLabel
                  active={sortKey === 'ghinClub'}
                  direction={sortKey === 'ghinClub' ? sortDir : 'asc'}
                  onClick={() => handleSort('ghinClub')}
                >
                  GHIN club
                </TableSortLabel>
              </TableCell>
              {eventCourses.map((course) => (
                <TableCell key={course.id}>{course.name}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={totalColumns}>Loading…</TableCell>
              </TableRow>
            ) : rosterRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalColumns}>
                  No roster entries for this event. Add players to teams under Teams management.
                </TableCell>
              </TableRow>
            ) : (
              sortedRosterRows.map((row) => {
                const p = normalizeOne(row.player);
                const t = normalizeOne(row.team);
                const ghin = ghinDrafts[row.id] ?? { ghinNumber: '', ghinClub: '' };
                return (
                  <TableRow key={row.id}>
                    <TableCell>{p?.first_name ?? '—'}</TableCell>
                    <TableCell>{p?.last_name ?? '—'}</TableCell>
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
                    <TableCell sx={{ maxWidth: 160 }}>
                      <TextField
                        size="small"
                        value={ghin.ghinNumber}
                        onChange={(e) =>
                          setGhinDrafts((prev) => ({
                            ...prev,
                            [row.id]: { ...ghin, ghinNumber: e.target.value },
                          }))
                        }
                        onBlur={() => saveGhin(row.id, row.player_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        fullWidth
                        inputProps={{ maxLength: 32 }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <TextField
                        size="small"
                        value={ghin.ghinClub}
                        onChange={(e) =>
                          setGhinDrafts((prev) => ({
                            ...prev,
                            [row.id]: { ...ghin, ghinClub: e.target.value },
                          }))
                        }
                        onBlur={() => saveGhin(row.id, row.player_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        fullWidth
                        inputProps={{ maxLength: 80 }}
                      />
                    </TableCell>
                    {eventCourses.map((course) => {
                      const courseHandicap = calculateCourseHandicap({
                        handicapIndex: row.handicap_at_event,
                        slope: course.slope,
                        rating: course.rating,
                        par: course.par,
                      });
                      return <TableCell key={course.id}>{courseHandicap ?? '—'}</TableCell>;
                    })}
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
