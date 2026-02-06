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
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Event } from '@/types/database';

const emptyEvent: Partial<Event> = {
  name: '',
  year: new Date().getFullYear(),
  location_city: '',
  location_state: '',
  resort_name: '',
  start_date: '',
  end_date: '',
  description: '',
  is_active: false,
};

export default function EventsAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('year', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAdd = () => {
    setEditingEvent({ ...emptyEvent });
    setDialogOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent({ ...event });
    setDialogOpen(true);
  };

  const handleDelete = (event: Event) => {
    setEventToDelete(event);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Event deleted successfully');
      fetchEvents();
    }
    setDeleteConfirmOpen(false);
    setEventToDelete(null);
  };

  const handleSave = async () => {
    if (!editingEvent) return;
    setError('');

    const eventData = {
      name: editingEvent.name,
      year: editingEvent.year,
      location_city: editingEvent.location_city,
      location_state: editingEvent.location_state,
      resort_name: editingEvent.resort_name || null,
      start_date: editingEvent.start_date,
      end_date: editingEvent.end_date,
      description: editingEvent.description || null,
      logo_url: editingEvent.logo_url || null,
      is_active: editingEvent.is_active ?? false,
    };

    if (editingEvent.id) {
      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Event updated successfully');
    } else {
      const { error } = await supabase
        .from('events')
        .insert([eventData]);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Event added successfully');
    }

    setDialogOpen(false);
    setEditingEvent(null);
    fetchEvents();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Events Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: '#2c3e50' }}
        >
          Add Event
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#2c3e50' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Year</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Location</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Resort</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Dates</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No events found</TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{event.name}</TableCell>
                  <TableCell>{event.year}</TableCell>
                  <TableCell>{event.location_city}, {event.location_state}</TableCell>
                  <TableCell>{event.resort_name || '-'}</TableCell>
                  <TableCell>{formatDate(event.start_date)} - {formatDate(event.end_date)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={event.is_active ? 'Active' : 'Inactive'} 
                      size="small" 
                      color={event.is_active ? 'success' : 'default'} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEdit(event)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(event)} size="small" color="error">
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEvent?.id ? 'Edit Event' : 'Add Event'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <TextField
              label="Event Name"
              value={editingEvent?.name || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
              required
              fullWidth
              placeholder="e.g., Patron Cup 2025"
            />
            <TextField
              label="Year"
              type="number"
              value={editingEvent?.year || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, year: parseInt(e.target.value) })}
              required
              fullWidth
            />
            <TextField
              label="City"
              value={editingEvent?.location_city || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, location_city: e.target.value })}
              required
              fullWidth
              placeholder="e.g., Bandon"
            />
            <TextField
              label="State"
              value={editingEvent?.location_state || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, location_state: e.target.value })}
              required
              fullWidth
              placeholder="e.g., OR"
            />
            <TextField
              label="Resort Name"
              value={editingEvent?.resort_name || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, resort_name: e.target.value })}
              fullWidth
              placeholder="e.g., Bandon Dunes Golf Resort"
              sx={{ gridColumn: { md: '1 / -1' } }}
            />
            <TextField
              label="Start Date"
              type="date"
              value={editingEvent?.start_date || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, start_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={editingEvent?.end_date || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, end_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Logo URL"
              value={editingEvent?.logo_url || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, logo_url: e.target.value })}
              fullWidth
              sx={{ gridColumn: { md: '1 / -1' } }}
            />
            <TextField
              label="Description"
              value={editingEvent?.description || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              sx={{ gridColumn: { md: '1 / -1' } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editingEvent?.is_active || false}
                  onChange={(e) => setEditingEvent({ ...editingEvent, is_active: e.target.checked })}
                />
              }
              label="Active Event (current/upcoming)"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {eventToDelete?.name}? This will also delete all associated teams, matches, and other data.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
