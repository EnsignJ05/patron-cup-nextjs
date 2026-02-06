'use client';
import { useState, useEffect, useMemo } from 'react';
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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { TeeTime, Event, Course, Player, TeeTimePlayer } from '@/types/database';

export default function TeeTimesAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [teeTimes, setTeeTimes] = useState<(TeeTime & { event?: Event; course?: Course })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeeTime, setEditingTeeTime] = useState<Partial<TeeTime> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teeTimeToDelete, setTeeTimeToDelete] = useState<TeeTime | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  // Players dialog
  const [playersDialogOpen, setPlayersDialogOpen] = useState(false);
  const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTime | null>(null);
  const [teeTimePlayers, setTeeTimePlayers] = useState<(TeeTimePlayer & { player?: Player })[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    
    const [teeTimesRes, eventsRes, coursesRes, playersRes] = await Promise.all([
      supabase
        .from('tee_times')
        .select('*, event:events(*), course:courses(*)')
        .order('tee_date', { ascending: true })
        .order('tee_time', { ascending: true }),
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('courses').select('*').order('name'),
      supabase.from('players').select('*').eq('is_active', true).order('last_name'),
    ]);

    if (teeTimesRes.error) setError(teeTimesRes.error.message);
    else setTeeTimes(teeTimesRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (coursesRes.data) setCourses(coursesRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    const activeEvent = events.find(e => e.is_active) || events[0];
    setEditingTeeTime({ 
      event_id: selectedEventId || activeEvent?.id,
      tee_date: new Date().toISOString().split('T')[0],
      tee_time: '08:00',
    });
    setDialogOpen(true);
  };

  const handleEdit = (teeTime: TeeTime) => {
    setEditingTeeTime({ ...teeTime });
    setDialogOpen(true);
  };

  const handleDelete = (teeTime: TeeTime) => {
    setTeeTimeToDelete(teeTime);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!teeTimeToDelete) return;
    
    const { error } = await supabase
      .from('tee_times')
      .delete()
      .eq('id', teeTimeToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Tee time deleted successfully');
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setTeeTimeToDelete(null);
  };

  const handleSave = async () => {
    if (!editingTeeTime) return;
    setError('');

    const teeTimeData = {
      event_id: editingTeeTime.event_id,
      course_id: editingTeeTime.course_id,
      tee_date: editingTeeTime.tee_date,
      tee_time: editingTeeTime.tee_time,
      group_number: editingTeeTime.group_number || null,
      notes: editingTeeTime.notes || null,
    };

    if (editingTeeTime.id) {
      const { error } = await supabase
        .from('tee_times')
        .update(teeTimeData)
        .eq('id', editingTeeTime.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Tee time updated successfully');
    } else {
      const { error } = await supabase
        .from('tee_times')
        .insert([teeTimeData]);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Tee time added successfully');
    }

    setDialogOpen(false);
    setEditingTeeTime(null);
    fetchData();
  };

  // Players management
  const openPlayersDialog = async (teeTime: TeeTime) => {
    setSelectedTeeTime(teeTime);
    setPlayersDialogOpen(true);
    
    const { data, error } = await supabase
      .from('tee_time_players')
      .select('*, player:players(*)')
      .eq('tee_time_id', teeTime.id);

    if (error) {
      setError(error.message);
    } else {
      setTeeTimePlayers(data || []);
    }
  };

  const addTeeTimePlayer = async () => {
    if (!selectedTeeTime || !selectedPlayerId) return;

    const { error } = await supabase
      .from('tee_time_players')
      .insert([{
        tee_time_id: selectedTeeTime.id,
        player_id: selectedPlayerId,
      }]);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player added to tee time');
      setSelectedPlayerId('');
      openPlayersDialog(selectedTeeTime);
    }
  };

  const removeTeeTimePlayer = async (ttpId: string) => {
    const { error } = await supabase
      .from('tee_time_players')
      .delete()
      .eq('id', ttpId);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player removed from tee time');
      if (selectedTeeTime) openPlayersDialog(selectedTeeTime);
    }
  };

  const filteredTeeTimes = selectedEventId 
    ? teeTimes.filter(t => t.event_id === selectedEventId)
    : teeTimes;

  const eventCourses = editingTeeTime?.event_id
    ? courses.filter(c => c.event_id === editingTeeTime.event_id || !c.event_id)
    : courses;

  const availablePlayers = players.filter(
    p => !teeTimePlayers.some(ttp => ttp.player_id === p.id)
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Tee Times Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: '#2c3e50' }}
        >
          Add Tee Time
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <FormControl sx={{ mb: 3, minWidth: 200 }}>
        <InputLabel>Filter by Event</InputLabel>
        <Select
          value={selectedEventId}
          label="Filter by Event"
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          <MenuItem value="">All Events</MenuItem>
          {events.map((event) => (
            <MenuItem key={event.id} value={event.id}>
              {event.name} ({event.year})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#2c3e50' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Time</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Course</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Event</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Group</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Notes</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredTeeTimes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No tee times found</TableCell>
              </TableRow>
            ) : (
              filteredTeeTimes.map((teeTime) => (
                <TableRow key={teeTime.id} hover>
                  <TableCell>{formatDate(teeTime.tee_date)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{formatTime(teeTime.tee_time)}</TableCell>
                  <TableCell>{teeTime.course?.name || '-'}</TableCell>
                  <TableCell>{teeTime.event?.name || '-'}</TableCell>
                  <TableCell>{teeTime.group_number || '-'}</TableCell>
                  <TableCell>{teeTime.notes || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openPlayersDialog(teeTime)} size="small" color="primary" title="Manage Players">
                      <PeopleIcon />
                    </IconButton>
                    <IconButton onClick={() => handleEdit(teeTime)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(teeTime)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTeeTime?.id ? 'Edit Tee Time' : 'Add Tee Time'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Event</InputLabel>
              <Select
                value={editingTeeTime?.event_id || ''}
                label="Event"
                onChange={(e) => setEditingTeeTime({ ...editingTeeTime, event_id: e.target.value })}
              >
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Course</InputLabel>
              <Select
                value={editingTeeTime?.course_id || ''}
                label="Course"
                onChange={(e) => setEditingTeeTime({ ...editingTeeTime, course_id: e.target.value })}
              >
                {eventCourses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Date"
              type="date"
              value={editingTeeTime?.tee_date || ''}
              onChange={(e) => setEditingTeeTime({ ...editingTeeTime, tee_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Time"
              type="time"
              value={editingTeeTime?.tee_time || ''}
              onChange={(e) => setEditingTeeTime({ ...editingTeeTime, tee_time: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Group Number"
              type="number"
              value={editingTeeTime?.group_number || ''}
              onChange={(e) => setEditingTeeTime({ ...editingTeeTime, group_number: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Notes"
              value={editingTeeTime?.notes || ''}
              onChange={(e) => setEditingTeeTime({ ...editingTeeTime, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#2c3e50' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Players Dialog */}
      <Dialog open={playersDialogOpen} onClose={() => setPlayersDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Players - {formatDate(selectedTeeTime?.tee_date || '')} at {formatTime(selectedTeeTime?.tee_time || '')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <FormControl sx={{ flex: 2 }}>
              <InputLabel>Select Player</InputLabel>
              <Select
                value={selectedPlayerId}
                label="Select Player"
                onChange={(e) => setSelectedPlayerId(e.target.value)}
              >
                {availablePlayers.map((player) => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.first_name} {player.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              onClick={addTeeTimePlayer}
              disabled={!selectedPlayerId}
              sx={{ bgcolor: '#2c3e50' }}
            >
              Add
            </Button>
          </Box>

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Players ({teeTimePlayers.length}/4)
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Handicap</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teeTimePlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">No players assigned</TableCell>
                  </TableRow>
                ) : (
                  teeTimePlayers.map((ttp) => (
                    <TableRow key={ttp.id}>
                      <TableCell>{ttp.player?.first_name} {ttp.player?.last_name}</TableCell>
                      <TableCell>{ttp.player?.current_handicap ?? '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => removeTeeTimePlayer(ttp.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlayersDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this tee time?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
