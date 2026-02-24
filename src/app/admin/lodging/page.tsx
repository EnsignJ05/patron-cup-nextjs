'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import Chip from '@mui/material/Chip';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Lodging, LodgingAssignment, Event, Player } from '@/types/database';

export default function LodgingAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [lodgings, setLodgings] = useState<(Lodging & { event?: Event })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLodging, setEditingLodging] = useState<Partial<Lodging> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lodgingToDelete, setLodgingToDelete] = useState<Lodging | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  // Assignments dialog
  const [assignmentsDialogOpen, setAssignmentsDialogOpen] = useState(false);
  const [selectedLodging, setSelectedLodging] = useState<Lodging | null>(null);
  const [assignments, setAssignments] = useState<(LodgingAssignment & { player?: Player })[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const [lodgingsRes, eventsRes, playersRes] = await Promise.all([
      supabase
        .from('lodging')
        .select('*, event:events(*)')
        .order('building_name'),
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('players').select('*').eq('is_active', true).order('last_name'),
    ]);

    if (lodgingsRes.error) setError(lodgingsRes.error.message);
    else setLodgings(lodgingsRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    const activeEvent = events.find(e => e.is_active) || events[0];
    setEditingLodging({ 
      event_id: selectedEventId || activeEvent?.id,
    });
    setDialogOpen(true);
  };

  const handleEdit = (lodging: Lodging) => {
    setEditingLodging({ ...lodging });
    setDialogOpen(true);
  };

  const handleDelete = (lodging: Lodging) => {
    setLodgingToDelete(lodging);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!lodgingToDelete) return;
    
    const { error } = await supabase
      .from('lodging')
      .delete()
      .eq('id', lodgingToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Lodging deleted successfully');
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setLodgingToDelete(null);
  };

  const handleSave = async () => {
    if (!editingLodging) return;
    setError('');

    const lodgingData = {
      event_id: editingLodging.event_id,
      building_name: editingLodging.building_name || null,
      room_number: editingLodging.room_number || null,
      room_type: editingLodging.room_type || null,
      check_in_date: editingLodging.check_in_date || null,
      check_out_date: editingLodging.check_out_date || null,
      notes: editingLodging.notes || null,
    };

    if (editingLodging.id) {
      const { error } = await supabase
        .from('lodging')
        .update(lodgingData)
        .eq('id', editingLodging.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Lodging updated successfully');
    } else {
      const { error } = await supabase
        .from('lodging')
        .insert([lodgingData]);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Lodging added successfully');
    }

    setDialogOpen(false);
    setEditingLodging(null);
    fetchData();
  };

  // Assignments management
  const openAssignmentsDialog = async (lodging: Lodging) => {
    setSelectedLodging(lodging);
    setAssignmentsDialogOpen(true);
    
    const { data, error } = await supabase
      .from('lodging_assignments')
      .select('*, player:players(*)')
      .eq('lodging_id', lodging.id);

    if (error) {
      setError(error.message);
    } else {
      setAssignments(data || []);
    }
  };

  const addAssignment = async () => {
    if (!selectedLodging || !selectedPlayerId) return;

    const { error } = await supabase
      .from('lodging_assignments')
      .insert([{
        lodging_id: selectedLodging.id,
        player_id: selectedPlayerId,
      }]);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player assigned to room');
      setSelectedPlayerId('');
      openAssignmentsDialog(selectedLodging);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('lodging_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player removed from room');
      if (selectedLodging) openAssignmentsDialog(selectedLodging);
    }
  };

  const togglePrimary = async (assignmentId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('lodging_assignments')
      .update({ is_primary: !currentValue })
      .eq('id', assignmentId);

    if (error) {
      setError(error.message);
    } else {
      if (selectedLodging) openAssignmentsDialog(selectedLodging);
    }
  };

  const filteredLodgings = selectedEventId 
    ? lodgings.filter(l => l.event_id === selectedEventId)
    : lodgings;

  const availablePlayers = players.filter(
    p => !assignments.some(a => a.player_id === p.id)
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Lodging Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: '#2c3e50' }}
        >
          Add Room
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
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Building</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Room #</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Event</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Dates</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Notes</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredLodgings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No lodging found</TableCell>
              </TableRow>
            ) : (
              filteredLodgings.map((lodging) => (
                <TableRow key={lodging.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{lodging.building_name || '-'}</TableCell>
                  <TableCell>{lodging.room_number || '-'}</TableCell>
                  <TableCell>{lodging.room_type || '-'}</TableCell>
                  <TableCell>{lodging.event?.name || '-'}</TableCell>
                  <TableCell>
                    {formatDate(lodging.check_in_date)} - {formatDate(lodging.check_out_date)}
                  </TableCell>
                  <TableCell>{lodging.notes || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openAssignmentsDialog(lodging)} size="small" color="primary" title="Manage Guests">
                      <PeopleIcon />
                    </IconButton>
                    <IconButton onClick={() => handleEdit(lodging)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(lodging)} size="small" color="error">
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
          {editingLodging?.id ? 'Edit Room' : 'Add Room'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Event</InputLabel>
              <Select
                value={editingLodging?.event_id || ''}
                label="Event"
                onChange={(e) => setEditingLodging({ ...editingLodging, event_id: e.target.value })}
              >
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Building Name"
              value={editingLodging?.building_name || ''}
              onChange={(e) => setEditingLodging({ ...editingLodging, building_name: e.target.value })}
              fullWidth
              placeholder="e.g., Chrome Lake, Lily Pond"
            />
            <TextField
              label="Room Number"
              value={editingLodging?.room_number || ''}
              onChange={(e) => setEditingLodging({ ...editingLodging, room_number: e.target.value })}
              fullWidth
            />
            <TextField
              label="Room Type"
              value={editingLodging?.room_type || ''}
              onChange={(e) => setEditingLodging({ ...editingLodging, room_type: e.target.value })}
              fullWidth
              placeholder="e.g., Suite, Double, Single"
            />
            <TextField
              label="Check-in Date"
              type="date"
              value={editingLodging?.check_in_date || ''}
              onChange={(e) => setEditingLodging({ ...editingLodging, check_in_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Check-out Date"
              type="date"
              value={editingLodging?.check_out_date || ''}
              onChange={(e) => setEditingLodging({ ...editingLodging, check_out_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              value={editingLodging?.notes || ''}
              onChange={(e) => setEditingLodging({ ...editingLodging, notes: e.target.value })}
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

      {/* Assignments Dialog */}
      <Dialog open={assignmentsDialogOpen} onClose={() => setAssignmentsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Room Assignments - {selectedLodging?.building_name} {selectedLodging?.room_number}
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
              onClick={addAssignment}
              disabled={!selectedPlayerId}
              sx={{ bgcolor: '#2c3e50' }}
            >
              Add
            </Button>
          </Box>

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Guests ({assignments.length})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Primary</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">No guests assigned</TableCell>
                  </TableRow>
                ) : (
                  assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.player?.first_name} {a.player?.last_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={a.is_primary ? 'Primary' : 'Guest'} 
                          size="small" 
                          color={a.is_primary ? 'primary' : 'default'}
                          onClick={() => togglePrimary(a.id, a.is_primary)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => removeAssignment(a.id)}
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
          <Button onClick={() => setAssignmentsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this room?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
