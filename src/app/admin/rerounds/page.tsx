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
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import PeopleIcon from '@mui/icons-material/People';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Event, Player, Course, Reround, ReroundSignup } from '@/types/database';

type ReroundWithRelations = Reround & {
  courses: Course;
  reround_signups?: (ReroundSignup & { players: Player })[];
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
  const [signupsDialogOpen, setSignupsDialogOpen] = useState(false);
  const [editingReround, setEditingReround] = useState<ReroundWithRelations | null>(null);
  const [selectedReround, setSelectedReround] = useState<ReroundWithRelations | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

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
      .select('*, courses(*), reround_signups(*, players(*))')
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

  async function handleSave(formData: FormData) {
    const reroundData = {
      event_id: selectedEvent,
      course_id: formData.get('course_id') as string,
      reround_date: formData.get('reround_date') as string,
      reround_time: formData.get('reround_time') as string || null,
      max_players: formData.get('max_players') ? Number(formData.get('max_players')) : null,
      notes: formData.get('notes') as string || null,
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
    if (!confirm('Are you sure you want to delete this re-round? This will also remove all signups.')) return;

    const { error } = await supabase.from('rerounds').delete().eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }

    fetchRerounds();
  }

  async function handleManageSignups(reround: ReroundWithRelations) {
    setSelectedReround(reround);
    const currentSignups = reround.reround_signups?.map((s) => s.player_id) || [];
    setSelectedPlayers(currentSignups);
    setSignupsDialogOpen(true);
  }

  async function handleSaveSignups() {
    if (!selectedReround) return;

    // Get current signups
    const currentSignups = selectedReround.reround_signups?.map((s) => s.player_id) || [];

    // Find players to add and remove
    const toAdd = selectedPlayers.filter((id) => !currentSignups.includes(id));
    const toRemove = currentSignups.filter((id) => !selectedPlayers.includes(id));

    // Remove unselected players
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('reround_signups')
        .delete()
        .eq('reround_id', selectedReround.id)
        .in('player_id', toRemove);

      if (error) {
        setError(error.message);
        return;
      }
    }

    // Add new players
    if (toAdd.length > 0) {
      const newSignups = toAdd.map((playerId) => ({
        reround_id: selectedReround.id,
        player_id: playerId,
        status: 'confirmed',
      }));

      const { error } = await supabase.from('reround_signups').insert(newSignups);

      if (error) {
        setError(error.message);
        return;
      }
    }

    setSignupsDialogOpen(false);
    setSelectedReround(null);
    setSelectedPlayers([]);
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
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
        <Typography variant="body2" sx={{ color: '#666' }}>
          {rerounds.length} re-round{rerounds.length !== 1 ? 's' : ''} scheduled
        </Typography>
      </Box>

      {Object.entries(reroundsByDate).map(([date, dateRerounds]) => (
        <Box key={date} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2c3e50' }}>
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
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Max Players</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Signups</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
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
                    <TableCell>{reround.max_players ?? 'Unlimited'}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${reround.reround_signups?.length || 0} players`}
                        size="small"
                        color={reround.reround_signups && reround.reround_signups.length > 0 ? 'primary' : 'default'}
                        onClick={() => handleManageSignups(reround)}
                        icon={<PeopleIcon />}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>{reround.notes || '-'}</TableCell>
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
              <TextField
                name="reround_date"
                label="Date"
                type="date"
                required
                defaultValue={editingReround?.reround_date || ''}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                name="reround_time"
                label="Tee Time"
                type="time"
                defaultValue={editingReround?.reround_time || ''}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                name="max_players"
                label="Max Players"
                type="number"
                defaultValue={editingReround?.max_players || ''}
                helperText="Leave empty for unlimited"
              />
              <TextField
                name="notes"
                label="Notes"
                multiline
                rows={2}
                defaultValue={editingReround?.notes || ''}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {setDialogOpen(false); setEditingReround(null);}}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Signups Dialog */}
      <Dialog
        open={signupsDialogOpen}
        onClose={() => {setSignupsDialogOpen(false); setSelectedReround(null); setSelectedPlayers([]);}}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Manage Signups - {selectedReround?.courses.name}
          {selectedReround?.reround_date && (
            <Typography variant="body2" sx={{ color: '#666' }}>
              {new Date(selectedReround.reround_date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              {selectedReround.reround_time && ` at ${new Date(`2000-01-01T${selectedReround.reround_time}`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}`}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedReround?.max_players && (
            <Alert severity={selectedPlayers.length >= selectedReround.max_players ? 'warning' : 'info'} sx={{ mb: 2 }}>
              {selectedPlayers.length} / {selectedReround.max_players} spots filled
            </Alert>
          )}
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {players.map((player) => (
              <FormControlLabel
                key={player.id}
                control={
                  <Checkbox
                    checked={selectedPlayers.includes(player.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (selectedReround?.max_players && selectedPlayers.length >= selectedReround.max_players) {
                          setError('Maximum players reached for this re-round');
                          return;
                        }
                        setSelectedPlayers([...selectedPlayers, player.id]);
                      } else {
                        setSelectedPlayers(selectedPlayers.filter((id) => id !== player.id));
                      }
                    }}
                  />
                }
                label={`${player.first_name} ${player.last_name}`}
                sx={{ display: 'block' }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {setSignupsDialogOpen(false); setSelectedReround(null); setSelectedPlayers([]);}}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveSignups}>
            Save Signups
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
