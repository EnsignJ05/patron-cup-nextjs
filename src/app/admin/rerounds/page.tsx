'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Event, Player, Course, Reround } from '@/types/database';

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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('year', { ascending: false });

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
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('status', 'active')
      .order('last_name');

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
      reround_time: formData.get('reround_time') as string || null,
      player1_id: (formData.get('player1_id') as string) || null,
      player2_id: (formData.get('player2_id') as string) || null,
      player3_id: (formData.get('player3_id') as string) || null,
      player4_id: (formData.get('player4_id') as string) || null,
    };

    if (editingReround) {
      const { error } = await supabase
        .from('rerounds')
        .update(reroundData)
        .eq('id', editingReround.id);

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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text)' }}>
          Re-rounds
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Re-round
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Event</InputLabel>
          <Select
            value={selectedEvent}
            label="Event"
            onChange={(e) => setSelectedEvent(e.target.value)}
          >
            {events.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {event.name} ({event.year})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
          {rerounds.length} re-round{rerounds.length !== 1 ? 's' : ''} scheduled
        </Typography>
      </Box>

      {Object.entries(reroundsByDate).map(([date, dateRerounds]) => (
        <Box key={date} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'var(--text)' }}>
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'var(--surface-muted)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Players</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dateRerounds.map((reround) => (
                  <TableRow key={reround.id} hover>
                    <TableCell>
                      {reround.reround_time
                        ? new Date(`2000-01-01T${reround.reround_time}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'TBD'}
                    </TableCell>
                    <TableCell>{reround.courses.name}</TableCell>
                    <TableCell>
                      {[reround.player1_id, reround.player2_id, reround.player3_id, reround.player4_id]
                        .map((playerId) => getPlayerName(playerId))
                        .join(', ')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingReround(reround);
                          setDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(reround.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}

      {!loading && rerounds.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#666' }}>
            No re-rounds scheduled for this event
          </Typography>
        </Paper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => {setDialogOpen(false); setEditingReround(null);}} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }}
        >
          <DialogTitle>{editingReround ? 'Edit Re-round' : 'Add Re-round'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>Course</InputLabel>
                <Select name="course_id" label="Course" defaultValue={editingReround?.course_id || ''}>
                  {eventCourses.length > 0 ? (
                    eventCourses.map((course) => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.name}
                      </MenuItem>
                    ))
                  ) : (
                    courses.map((course) => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.name}
                      </MenuItem>
                    ))
                  )}
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
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {setDialogOpen(false); setEditingReround(null);}}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

    </Box>
  );
}
