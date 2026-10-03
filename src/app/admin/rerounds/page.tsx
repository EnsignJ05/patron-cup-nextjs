'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Event, Player, Course, Reround } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

type ReroundWithRelations = Reround & {
  courses: Course;
};

export default function ReroundsPage() {
  const [rerounds, setRerounds] = useState<ReroundWithRelations[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReround, setEditingReround] = useState<ReroundWithRelations | null>(null);
  const [reroundDate, setReroundDate] = useState<Date | null>(null);
  const [reroundDateValue, setReroundDateValue] = useState('');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase.from('events').select('*').order('year', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEvents(data || []);
      if (data && data.length > 0) {
        setSelectedEvent(data[0].id);
      }
    }
  }, [supabase]);

  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase.from('players').select('*').eq('is_active', true).order('last_name');

    if (error) {
      setError(error.message);
    } else {
      setPlayers(data || []);
    }
  }, [supabase]);

  const fetchCourses = useCallback(async () => {
    const { data, error } = await supabase.from('courses').select('*').order('name');

    if (error) {
      setError(error.message);
    } else {
      setCourses(data || []);
    }
  }, [supabase]);

  const fetchRerounds = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rerounds')
      .select('*, courses(*)')
      .eq('event_id', selectedEvent)
      .order('reround_date')
      .order('reround_time');

    if (error) {
      setError(error.message);
    } else {
      setRerounds(data || []);
    }
    setLoading(false);
  }, [selectedEvent, supabase]);

  useEffect(() => {
    fetchEvents();
    fetchPlayers();
    fetchCourses();
  }, [fetchEvents, fetchPlayers, fetchCourses]);

  useEffect(() => {
    if (selectedEvent) {
      fetchRerounds();
    }
  }, [selectedEvent, fetchRerounds]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingReround?.reround_date) {
      setReroundDate(new Date(`${editingReround.reround_date}T00:00:00`));
      setReroundDateValue(editingReround.reround_date);
    } else {
      setReroundDate(null);
      setReroundDateValue('');
    }
  }, [dialogOpen, editingReround]);

  async function handleSave(formData: FormData) {
    const reroundData = {
      event_id: selectedEvent,
      course_id: formData.get('course_id') as string,
      reround_date: formData.get('reround_date') as string,
      reround_time: (formData.get('reround_time') as string) || null,
      player1_id: (formData.get('player1_id') as string) || null,
      player2_id: (formData.get('player2_id') as string) || null,
      player3_id: (formData.get('player3_id') as string) || null,
      player4_id: (formData.get('player4_id') as string) || null,
    };

    if (editingReround) {
      const { error } = await supabase.from('rerounds').update(reroundData).eq('id', editingReround.id);

      if (error) {
        setError(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('rerounds').insert(reroundData);

      if (error) {
        setError(error.message);
        return;
      }
    }

    setDialogOpen(false);
    setEditingReround(null);
    fetchRerounds();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this re-round?')) return;

    const { error } = await supabase.from('rerounds').delete().eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }

    fetchRerounds();
  }

  // Group rerounds by date
  const reroundsByDate = rerounds.reduce((acc, reround) => {
    const date = reround.reround_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(reround);
    return acc;
  }, {} as Record<string, ReroundWithRelations[]>);

  const eventCourses = courses.filter((c) => c.event_id === selectedEvent);
  const activePlayers = players;
  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    activePlayers.forEach((player) => {
      map.set(player.id, player);
    });
    return map;
  }, [activePlayers]);

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return 'TBD';
    const player = playersById.get(playerId);
    return player ? `${player.first_name} ${player.last_name}` : 'TBD';
  };

  return (
    <div>
      <AdminHead
        crumb="Re-rounds"
        title="Re-rounds"
        sub={`${rerounds.length} re-round${rerounds.length === 1 ? '' : 's'} scheduled.`}
        actions={
          <>
            <FormControl size="small" className={styles.eventFilter}>
              <InputLabel>Event</InputLabel>
              <Select value={selectedEvent} label="Event" onChange={(e) => setSelectedEvent(e.target.value)}>
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={() => setDialogOpen(true)}>
              <AIcon name="plus" size={14} />
              <span>Add Re-round</span>
            </button>
          </>
        }
      />

      {error && (
        <Alert severity="error" className={styles.alert} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {Object.entries(reroundsByDate).map(([date, dateRerounds]) => (
        <div key={date} className={styles.dateGroup}>
          <h2 className={styles.dateHeading}>
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h2>
          <div className="ad-card" style={{ overflow: 'hidden' }}>
            <div className={`ad-row head ${styles.reroundGrid}`}>
              <span className="ad-th">Time</span>
              <span className="ad-th">Course</span>
              <span className="ad-th">Players</span>
              <span className="ad-th" />
            </div>
            {dateRerounds.map((reround) => (
              <div key={reround.id} className={`ad-row hover ${styles.reroundGrid}`}>
                <span className="ad-num" style={{ textAlign: 'left' }}>
                  {reround.reround_time
                    ? new Date(`2000-01-01T${reround.reround_time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'TBD'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{reround.courses.name}</span>
                <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>
                  {[reround.player1_id, reround.player2_id, reround.player3_id, reround.player4_id]
                    .map((playerId) => getPlayerName(playerId))
                    .join(', ')}
                </span>
                <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <button
                    type="button"
                    className="ad-ib"
                    onClick={() => {
                      setEditingReround(reround);
                      setDialogOpen(true);
                    }}
                    aria-label="Edit re-round"
                  >
                    <AIcon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    className="ad-ib"
                    onClick={() => handleDelete(reround.id)}
                    aria-label="Delete re-round"
                  >
                    <AIcon name="trash" size={16} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!loading && rerounds.length === 0 && (
        <div className={`ad-card ${styles.emptyState}`}>
          <div className={styles.emptyIcon}>
            <AIcon name="rerounds" size={24} />
          </div>
          <div className={styles.emptyTitle}>No re-rounds scheduled</div>
          <div className={styles.emptyBody}>Add a re-round for this event to get started.</div>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingReround(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: 'ad-dlg' }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }}
        >
          <div className="ad-dlg-h">
            <div>
              <div className="ad-crumb">Re-rounds</div>
              <h2 className={styles.dialogTitle}>{editingReround ? 'Edit re-round' : 'Add re-round'}</h2>
            </div>
            <button
              type="button"
              className="ad-ib"
              onClick={() => {
                setDialogOpen(false);
                setEditingReround(null);
              }}
              aria-label="Close"
            >
              <AIcon name="x" size={18} />
            </button>
          </div>
          <DialogContent>
            <div className={styles.formFields}>
              <FormControl fullWidth required>
                <InputLabel>Course</InputLabel>
                <Select name="course_id" label="Course" defaultValue={editingReround?.course_id || ''}>
                  {(eventCourses.length > 0 ? eventCourses : courses).map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <input type="hidden" name="reround_date" value={reroundDateValue} />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={reroundDate}
                  onChange={(value) => {
                    setReroundDate(value);
                    setReroundDateValue(value ? format(value, 'yyyy-MM-dd') : '');
                  }}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                    },
                  }}
                />
              </LocalizationProvider>
              <TextField
                name="reround_time"
                label="Tee Time"
                type="time"
                defaultValue={editingReround?.reround_time || ''}
                InputLabelProps={{ shrink: true }}
              />
              {[
                { name: 'player1_id', label: 'Player 1' },
                { name: 'player2_id', label: 'Player 2' },
                { name: 'player3_id', label: 'Player 3' },
                { name: 'player4_id', label: 'Player 4' },
              ].map((field) => (
                <FormControl fullWidth key={field.name}>
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    name={field.name}
                    label={field.label}
                    defaultValue={editingReround?.[field.name as keyof Reround] || ''}
                  >
                    <MenuItem value="">TBD</MenuItem>
                    {activePlayers.map((player) => (
                      <MenuItem key={player.id} value={player.id}>
                        {player.first_name} {player.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </div>
          </DialogContent>
          <div className="ad-dlg-f">
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="pc-d-actionbtn"
              onClick={() => {
                setDialogOpen(false);
                setEditingReround(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="pc-d-actionbtn" data-primary="true">
              Save re-round
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
