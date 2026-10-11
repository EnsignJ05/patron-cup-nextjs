'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { buildEventHandicapsCsv, type HandicapCsvCourse, type HandicapCsvRow } from '@/lib/exportEventHandicapsCsv';
import { sanitizeFilenameSegment } from '@/lib/exportEventMatchesCsv';
import { calculateCourseHandicap } from '@/lib/courseHandicap';
import type { Course, Event } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

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

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'team', label: 'Team' },
  { key: 'handicap', label: 'Official HCP' },
  { key: 'ghinNumber', label: 'GHIN #' },
  { key: 'ghinClub', label: 'GHIN club' },
];

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
  const [searchTerm, setSearchTerm] = useState('');
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
      supabase.from('courses').select('id, name, par, rating, slope').eq('event_id', selectedEventId).order('name', { ascending: true }),
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
      .select('id, player_id, handicap_at_event, player:players(first_name, last_name, ghin_number, ghin_club), team:teams(name)')
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

  const filteredRosterRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rosterRows;
    return rosterRows.filter((row) => {
      const p = normalizeOne(row.player);
      return `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.toLowerCase().includes(term);
    });
  }, [rosterRows, searchTerm]);

  const sortedRosterRows = useMemo(() => {
    const rows = [...filteredRosterRows];
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const pa = normalizeOne(a.player);
      const pb = normalizeOne(b.player);
      const ta = normalizeOne(a.team);
      const tb = normalizeOne(b.team);
      switch (sortKey) {
        case 'firstName':
          return (pa?.first_name ?? '').localeCompare(pb?.first_name ?? '', undefined, { sensitivity: 'base' }) * dir;
        case 'lastName':
          return (pa?.last_name ?? '').localeCompare(pb?.last_name ?? '', undefined, { sensitivity: 'base' }) * dir;
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
          return (pa?.ghin_number ?? '').localeCompare(pb?.ghin_number ?? '', undefined, { sensitivity: 'base' }) * dir;
        case 'ghinClub':
          return (pa?.ghin_club ?? '').localeCompare(pb?.ghin_club ?? '', undefined, { sensitivity: 'base' }) * dir;
        default:
          return 0;
      }
    });
    return rows;
  }, [filteredRosterRows, sortKey, sortDir]);

  const csvRows: HandicapCsvRow[] = useMemo(() => {
    return rosterRows.map((r) => {
      const p = normalizeOne(r.player);
      const t = normalizeOne(r.team);
      const name = p ? `${p.first_name} ${p.last_name}`.trim() : 'Unknown';
      const courseHandicaps = Object.fromEntries(
        eventCourses.map((course) => [
          course.id,
          calculateCourseHandicap({
            handicapIndex: r.handicap_at_event,
            slope: course.slope,
            rating: course.rating,
            par: course.par,
          }),
        ]),
      );
      return {
        playerName: name,
        teamName: t?.name ?? '',
        officialHandicap: r.handicap_at_event,
        ghinNumber: p?.ghin_number ?? null,
        ghinClub: p?.ghin_club ?? null,
        courseHandicaps,
      };
    });
  }, [eventCourses, rosterRows]);

  const csvCourses: HandicapCsvCourse[] = useMemo(() => eventCourses.map((course) => ({ id: course.id, name: course.name })), [eventCourses]);

  const handleExportCsv = useCallback(() => {
    if (!selectedEvent) return;
    const csv = buildEventHandicapsCsv(selectedEvent, csvRows, csvCourses);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const base = sanitizeFilenameSegment(`${selectedEvent.name}-${selectedEvent.year}-handicaps`);
    anchor.download = `${base}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [csvCourses, csvRows, selectedEvent]);

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

    const { error: upErr } = await supabase.from('players').update({ ghin_number: ghinNumber, ghin_club: ghinClub }).eq('id', playerId);

    if (upErr) {
      setError(upErr.message);
      return;
    }
    setSuccess('GHIN details updated.');
    fetchRosters();
  };

  // Column count varies with the event's course list, so the grid template is computed,
  // not a static CSS class. minmax(0, Nfr) (not bare Nfr) keeps each row's fr tracks at the
  // same computed width regardless of that row's own content, since minWidth: 'max-content'
  // below (needed so the table can scroll horizontally once course columns are added) lets
  // each `.ad-row` size itself independently -- without the 0 floor, a long team/player name
  // in one row grows that row's track past its fr share while shorter rows don't, visibly
  // misaligning columns between rows.
  const gridTemplate = `minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr) 110px 90px 110px${eventCourses.map(() => ' 90px').join('')}`;

  return (
    <div>
      <AdminHead
        crumb="Handicaps"
        title="Handicaps"
        sub="Click a column to sort. Edit an index inline."
        actions={
          <>
            <FormControl size="small" className={styles.eventFilter}>
              <InputLabel>Event</InputLabel>
              <Select value={selectedEventId} label="Event" onChange={(e) => setSelectedEventId(e.target.value)}>
                {events.map((ev) => (
                  <MenuItem key={ev.id} value={ev.id}>
                    {ev.name} ({ev.year})
                    {ev.is_active ? ' — active' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <button type="button" className="pc-d-actionbtn" disabled={!selectedEvent || rosterRows.length === 0} onClick={handleExportCsv}>
              <AIcon name="save" size={14} />
              <span>Export CSV</span>
            </button>
          </>
        }
      />

      <p className={styles.explainer}>
        Official handicaps are stored on team rosters for the selected event. GHIN number and club are stored on each
        player&apos;s profile and can be edited here. Course handicaps are computed as round(HI × (slope/113) + (rating − par)).
      </p>

      {error && (
        <Alert severity="error" className={styles.alert} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" className={styles.alert} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <div className="ad-in" style={{ width: 320, justifyContent: 'flex-start', color: 'var(--pc-ink-3)', marginBottom: 14 }}>
        <AIcon name="search" size={16} />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search players"
          style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'var(--pc-ink)', width: '100%' }}
        />
      </div>

      <div className="ad-card" style={{ overflow: 'auto' }}>
        <div className="ad-row head" style={{ gridTemplateColumns: gridTemplate, minWidth: 'max-content' }}>
          {SORT_COLUMNS.map(({ key, label }) => {
            const active = sortKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSort(key)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: active ? 'var(--pc-ink)' : 'var(--pc-ink-3)',
                }}
              >
                {label}
                <span style={{ opacity: active ? 1 : 0.45 }}>
                  <AIcon name={active ? (sortDir === 'asc' ? 'up' : 'down') : 'updown'} size={13} />
                </span>
              </button>
            );
          })}
          {eventCourses.map((course) => (
            <span key={course.id} className="ad-th">
              {course.name}
            </span>
          ))}
        </div>
        {loading ? (
          <div className="ad-row" style={{ gridTemplateColumns: gridTemplate, minWidth: 'max-content' }}>
            {Array.from({ length: 6 + eventCourses.length }).map((_, i) => (
              <div key={i} className="ad-sk" style={{ width: '70%' }} />
            ))}
          </div>
        ) : rosterRows.length === 0 ? (
          <div className={styles.emptyState}>No roster entries for this event. Add players to teams under Teams management.</div>
        ) : sortedRosterRows.length === 0 ? (
          <div className={styles.emptyState}>No players match &ldquo;{searchTerm}&rdquo;.</div>
        ) : (
          sortedRosterRows.map((row) => {
            const p = normalizeOne(row.player);
            const t = normalizeOne(row.team);
            const ghin = ghinDrafts[row.id] ?? { ghinNumber: '', ghinClub: '' };
            return (
              <div key={row.id} className="ad-row hover" style={{ gridTemplateColumns: gridTemplate, minWidth: 'max-content' }}>
                <span style={{ fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p?.first_name ?? '—'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p?.last_name ?? '—'}
                </span>
                <span style={{ minWidth: 0, overflow: 'hidden' }}>
                  <span className="ad-badge" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t?.name ?? '—'}
                  </span>
                </span>
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ step: 0.1 }}
                  value={handicapDrafts[row.id] ?? ''}
                  onChange={(e) => setHandicapDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  onBlur={() => saveHandicap(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                />
                <TextField
                  size="small"
                  value={ghin.ghinNumber}
                  onChange={(e) => setGhinDrafts((prev) => ({ ...prev, [row.id]: { ...ghin, ghinNumber: e.target.value } }))}
                  onBlur={() => saveGhin(row.id, row.player_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  inputProps={{ maxLength: 32 }}
                />
                <TextField
                  size="small"
                  value={ghin.ghinClub}
                  onChange={(e) => setGhinDrafts((prev) => ({ ...prev, [row.id]: { ...ghin, ghinClub: e.target.value } }))}
                  onBlur={() => saveGhin(row.id, row.player_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  inputProps={{ maxLength: 80 }}
                />
                {eventCourses.map((course) => {
                  const courseHandicap = calculateCourseHandicap({
                    handicapIndex: row.handicap_at_event,
                    slope: course.slope,
                    rating: course.rating,
                    par: course.par,
                  });
                  return (
                    <span key={course.id} className="ad-num">
                      {courseHandicap ?? '—'}
                    </span>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
      <p className={styles.footerNote}>
        Showing {sortedRosterRows.length} of {rosterRows.length}
      </p>
    </div>
  );
}
