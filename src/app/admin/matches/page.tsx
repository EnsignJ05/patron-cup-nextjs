'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Match, Event, Course } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

export default function MatchesAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const matchDateInputRef = useRef<HTMLInputElement>(null);
  const [matches, setMatches] = useState<(Match & { event?: Event; course?: Course })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [bulkPlayerCount, setBulkPlayerCount] = useState('');

  const matchTypeOptions = ['Two Man Better Ball', 'Head to Head'];

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [matchesRes, eventsRes, coursesRes] = await Promise.all([
      supabase.from('matches').select('*, event:events(*), course:courses(*)').order('match_date', { ascending: false }),
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('courses').select('*').order('name'),
    ]);

    if (matchesRes.error) setError(matchesRes.error.message);
    else setMatches(matchesRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (coursesRes.data) setCourses(coursesRes.data);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    const activeEvent = events.find((e) => e.is_active) || events[0];
    setEditingMatch({
      event_id: selectedEventId || activeEvent?.id,
      match_date: new Date().toISOString().split('T')[0],
      match_type: 'Two Man Better Ball',
      is_halved: false,
    });
    setBulkPlayerCount('');
    setDialogOpen(true);
  };

  const handleEdit = (match: Match) => {
    setEditingMatch({ ...match });
    setDialogOpen(true);
  };

  const handleDelete = (match: Match) => {
    setMatchToDelete(match);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!matchToDelete) return;

    const { error } = await supabase.from('matches').delete().eq('id', matchToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Match deleted successfully');
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setMatchToDelete(null);
  };

  const handleSave = async () => {
    if (!editingMatch) return;
    setError('');

    if (!editingMatch.id && !editingMatch.course_id) {
      setError('Please select a course for the new matches.');
      return;
    }

    const matchData = {
      event_id: editingMatch.event_id,
      match_number: editingMatch.match_number || 1,
      group_number: editingMatch.group_number || null,
      course_id: editingMatch.course_id || null,
      match_date: editingMatch.match_date,
      match_time: editingMatch.match_time || null,
      match_type: editingMatch.match_type,
      winner_team_id: editingMatch.winner_team_id || null,
      is_halved: editingMatch.is_halved || false,
      notes: editingMatch.notes || null,
    };

    const getPlayersPerMatch = (matchType: string) => {
      if (matchType === 'Two Man Better Ball') return 4;
      if (matchType === 'Head to Head') return 2;
      return null;
    };

    if (editingMatch.id) {
      const { error } = await supabase.from('matches').update(matchData).eq('id', editingMatch.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Match updated successfully');
    } else {
      const totalPlayers = parseInt(bulkPlayerCount, 10);
      const playersPerMatch = getPlayersPerMatch(editingMatch.match_type || '');

      if (!totalPlayers || totalPlayers <= 0) {
        setError('Please enter a valid number of players.');
        return;
      }

      if (!playersPerMatch) {
        setError('Please select a valid match type.');
        return;
      }

      if (totalPlayers % playersPerMatch !== 0) {
        setError(`Total players must be divisible by ${playersPerMatch}.`);
        return;
      }

      const matchCount = totalPlayers / playersPerMatch;
      const existingMaxMatchNumber = Math.max(0, ...matches.filter((match) => match.event_id === editingMatch.event_id).map((match) => match.match_number || 0));
      const bulkMatches = Array.from({ length: matchCount }, (_, index) => ({
        ...matchData,
        match_number: existingMaxMatchNumber + index + 1,
        group_number: null,
        match_time: null,
        winner_team_id: null,
        is_halved: false,
      }));

      const { error } = await supabase.from('matches').insert(bulkMatches);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess(`${matchCount} matches added successfully`);
    }

    setDialogOpen(false);
    setEditingMatch(null);
    fetchData();
  };

  const filteredMatches = selectedEventId ? matches.filter((m) => m.event_id === selectedEventId) : matches;

  const eventCourses = editingMatch?.event_id ? courses.filter((c) => c.event_id === editingMatch.event_id || !c.event_id) : courses;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  return (
    <div>
      <AdminHead
        crumb="Matches"
        title="Matches"
        sub="Pairings and results."
        actions={
          <>
            <FormControl size="small" className={styles.eventFilter}>
              <InputLabel>Event</InputLabel>
              <Select value={selectedEventId} label="Event" onChange={(e) => setSelectedEventId(e.target.value)}>
                <MenuItem value="">All events</MenuItem>
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Link href="/admin/matches/setup" className="pc-d-actionbtn">
              Open Match Setup
            </Link>
            <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleAdd}>
              <AIcon name="plus" size={14} />
              <span>Add Matches</span>
            </button>
          </>
        }
      />

      {error && (
        <Alert severity="error" className={styles.alert} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" className={styles.alert} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <div className="ad-card" style={{ overflow: 'hidden' }}>
        <div className={`ad-row head ${styles.matchGrid}`}>
          <span className="ad-th">Date</span>
          <span className="ad-th">Time</span>
          <span className="ad-th">Course</span>
          <span className="ad-th">Type</span>
          <span className="ad-th" />
        </div>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={`ad-row ${styles.matchGrid}`}>
              {[45, 30, 50, 55, 0].map((w, j) => (
                <div key={j} className="ad-sk" style={{ width: w ? `${w}%` : 0, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ))
        ) : filteredMatches.length === 0 ? (
          <div className={styles.emptyState}>No matches found</div>
        ) : (
          filteredMatches.map((match) => (
            <div key={match.id} className={`ad-row hover ${styles.matchGrid}`}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(match.match_date)}</span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)', fontFamily: 'var(--pc-font-mono)' }}>{match.match_time || 'TBD'}</span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>{match.course?.name || '—'}</span>
              <span>
                <span className="ad-badge">{match.match_type}</span>
              </span>
              <span style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                <Link href={`/admin/matches/setup?eventId=${match.event_id}`} className={styles.setupLink}>
                  Setup
                </Link>
                <button type="button" className="ad-ib" onClick={() => handleEdit(match)} aria-label="Edit match">
                  <AIcon name="edit" size={16} />
                </button>
                <button type="button" className="ad-ib" onClick={() => handleDelete(match)} aria-label="Delete match">
                  <AIcon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <div>
            <div className="ad-crumb">Matches</div>
            <h2 className={styles.dialogTitle}>{editingMatch?.id ? 'Edit match' : 'Add matches'}</h2>
          </div>
          <button type="button" className="ad-ib" onClick={() => setDialogOpen(false)} aria-label="Close">
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          <div className={styles.formGrid}>
            <FormControl fullWidth required>
              <InputLabel>Event</InputLabel>
              <Select value={editingMatch?.event_id || ''} label="Event" onChange={(e) => setEditingMatch({ ...editingMatch, event_id: e.target.value })}>
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Match Date"
              type="date"
              value={editingMatch?.match_date || ''}
              onChange={(e) => setEditingMatch({ ...editingMatch, match_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputRef={matchDateInputRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Open date picker"
                      edge="end"
                      onClick={() => {
                        const input = matchDateInputRef.current;
                        if (!input) return;
                        if (typeof (input as HTMLInputElement).showPicker === 'function') {
                          (input as HTMLInputElement).showPicker();
                        } else {
                          input.focus();
                        }
                      }}
                    >
                      <CalendarTodayIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth required>
              <InputLabel>Match Type</InputLabel>
              <Select value={editingMatch?.match_type || ''} label="Match Type" onChange={(e) => setEditingMatch({ ...editingMatch, match_type: e.target.value })}>
                {matchTypeOptions.map((matchType) => (
                  <MenuItem key={matchType} value={matchType}>
                    {matchType}
                  </MenuItem>
                ))}
                {editingMatch?.match_type && !matchTypeOptions.includes(editingMatch.match_type) ? (
                  <MenuItem value={editingMatch.match_type}>{editingMatch.match_type}</MenuItem>
                ) : null}
              </Select>
            </FormControl>
            <FormControl fullWidth required={!editingMatch?.id}>
              <InputLabel>Course</InputLabel>
              <Select value={editingMatch?.course_id || ''} label="Course" onChange={(e) => setEditingMatch({ ...editingMatch, course_id: e.target.value || null })}>
                <MenuItem value="">Select Course</MenuItem>
                {eventCourses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!editingMatch?.id ? (
              <TextField label="Number of Players" type="number" value={bulkPlayerCount} onChange={(e) => setBulkPlayerCount(e.target.value)} required fullWidth />
            ) : null}
            {editingMatch?.id ? (
              <TextField
                label="Match Time"
                type="time"
                value={editingMatch?.match_time || ''}
                onChange={(e) => setEditingMatch({ ...editingMatch, match_time: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            ) : null}
            <TextField
              label="Notes"
              value={editingMatch?.notes || ''}
              onChange={(e) => setEditingMatch({ ...editingMatch, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
              className={styles.fieldWide}
            />
          </div>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleSave}>
            Save
          </button>
        </div>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <h2 className={styles.dialogTitle}>Delete match?</h2>
        </div>
        <DialogContent>
          <p style={{ margin: 0, color: 'var(--pc-ink-2)' }}>Are you sure you want to delete this match?</p>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="pc-d-actionbtn"
            data-primary="true"
            style={{ background: 'var(--pc-team-a)', borderColor: 'var(--pc-team-a)' }}
            onClick={confirmDelete}
          >
            Delete
          </button>
        </div>
      </Dialog>
    </div>
  );
}
