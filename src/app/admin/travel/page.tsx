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
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { TravelInfo, Event, Player } from '@/types/database';

export default function TravelAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [travelInfo, setTravelInfo] = useState<(TravelInfo & { event?: Event; player?: Player })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTravel, setEditingTravel] = useState<Partial<TravelInfo> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [travelToDelete, setTravelToDelete] = useState<TravelInfo | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const [travelRes, eventsRes, playersRes] = await Promise.all([
      supabase
        .from('travel_info')
        .select('*, event:events(*), player:players(*)')
        .order('arrival_date', { ascending: true }),
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('players').select('*').eq('is_active', true).order('last_name'),
    ]);

    if (travelRes.error) setError(travelRes.error.message);
    else setTravelInfo(travelRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    const activeEvent = events.find(e => e.is_active) || events[0];
    setEditingTravel({ 
      event_id: selectedEventId || activeEvent?.id,
      needs_transportation: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (travel: TravelInfo) => {
    setEditingTravel({ ...travel });
    setDialogOpen(true);
  };

  const handleDelete = (travel: TravelInfo) => {
    setTravelToDelete(travel);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!travelToDelete) return;
    
    const { error } = await supabase
      .from('travel_info')
      .delete()
      .eq('id', travelToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Travel info deleted successfully');
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setTravelToDelete(null);
  };

  const handleSave = async () => {
    if (!editingTravel) return;
    setError('');

    const travelData = {
      player_id: editingTravel.player_id,
      event_id: editingTravel.event_id,
      arrival_date: editingTravel.arrival_date || null,
      arrival_time: editingTravel.arrival_time || null,
      arrival_flight_number: editingTravel.arrival_flight_number || null,
      arrival_airline: editingTravel.arrival_airline || null,
      arrival_airport: editingTravel.arrival_airport || null,
      arrival_notes: editingTravel.arrival_notes || null,
      departure_date: editingTravel.departure_date || null,
      departure_time: editingTravel.departure_time || null,
      departure_flight_number: editingTravel.departure_flight_number || null,
      departure_airline: editingTravel.departure_airline || null,
      departure_airport: editingTravel.departure_airport || null,
      departure_notes: editingTravel.departure_notes || null,
      needs_transportation: editingTravel.needs_transportation || false,
      rental_car_info: editingTravel.rental_car_info || null,
      notes: editingTravel.notes || null,
    };

    if (editingTravel.id) {
      const { error } = await supabase
        .from('travel_info')
        .update(travelData)
        .eq('id', editingTravel.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Travel info updated successfully');
    } else {
      const { error } = await supabase
        .from('travel_info')
        .insert([travelData]);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Travel info added successfully');
    }

    setDialogOpen(false);
    setEditingTravel(null);
    fetchData();
  };

  let filteredTravel = travelInfo;
  if (selectedEventId) {
    filteredTravel = filteredTravel.filter(t => t.event_id === selectedEventId);
  }
  if (searchTerm) {
    filteredTravel = filteredTravel.filter(t => 
      `${t.player?.first_name} ${t.player?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
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
          Travel Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: '#2c3e50' }}
        >
          Add Travel Info
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
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
        <TextField
          placeholder="Search by player name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#2c3e50' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Player</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Event</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Arrival</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Departure</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Transport</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredTravel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No travel info found</TableCell>
              </TableRow>
            ) : (
              filteredTravel.map((travel) => (
                <TableRow key={travel.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {travel.player?.first_name} {travel.player?.last_name}
                  </TableCell>
                  <TableCell>{travel.event?.name || '-'}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{formatDate(travel.arrival_date)} {formatTime(travel.arrival_time)}</Typography>
                      {travel.arrival_flight_number && (
                        <Typography variant="caption" color="textSecondary">
                          {travel.arrival_airline} {travel.arrival_flight_number}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{formatDate(travel.departure_date)} {formatTime(travel.departure_time)}</Typography>
                      {travel.departure_flight_number && (
                        <Typography variant="caption" color="textSecondary">
                          {travel.departure_airline} {travel.departure_flight_number}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={travel.needs_transportation ? 'Needs Ride' : 'Self'} 
                      size="small" 
                      color={travel.needs_transportation ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEdit(travel)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(travel)} size="small" color="error">
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
          {editingTravel?.id ? 'Edit Travel Info' : 'Add Travel Info'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Player</InputLabel>
              <Select
                value={editingTravel?.player_id || ''}
                label="Player"
                onChange={(e) => setEditingTravel({ ...editingTravel, player_id: e.target.value })}
              >
                {players.map((player) => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.first_name} {player.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Event</InputLabel>
              <Select
                value={editingTravel?.event_id || ''}
                label="Event"
                onChange={(e) => setEditingTravel({ ...editingTravel, event_id: e.target.value })}
              >
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle1" sx={{ gridColumn: '1 / -1', fontWeight: 600, mt: 2, borderBottom: '1px solid #ddd', pb: 1 }}>
              Arrival Information
            </Typography>
            
            <TextField
              label="Arrival Date"
              type="date"
              value={editingTravel?.arrival_date || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, arrival_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Arrival Time"
              type="time"
              value={editingTravel?.arrival_time || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, arrival_time: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Airline"
              value={editingTravel?.arrival_airline || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, arrival_airline: e.target.value })}
              fullWidth
            />
            <TextField
              label="Flight Number"
              value={editingTravel?.arrival_flight_number || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, arrival_flight_number: e.target.value })}
              fullWidth
            />
            <TextField
              label="Arrival Airport"
              value={editingTravel?.arrival_airport || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, arrival_airport: e.target.value })}
              fullWidth
              placeholder="e.g., PDX, OTH"
            />
            <TextField
              label="Arrival Notes"
              value={editingTravel?.arrival_notes || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, arrival_notes: e.target.value })}
              fullWidth
            />

            <Typography variant="subtitle1" sx={{ gridColumn: '1 / -1', fontWeight: 600, mt: 2, borderBottom: '1px solid #ddd', pb: 1 }}>
              Departure Information
            </Typography>
            
            <TextField
              label="Departure Date"
              type="date"
              value={editingTravel?.departure_date || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, departure_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Departure Time"
              type="time"
              value={editingTravel?.departure_time || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, departure_time: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Airline"
              value={editingTravel?.departure_airline || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, departure_airline: e.target.value })}
              fullWidth
            />
            <TextField
              label="Flight Number"
              value={editingTravel?.departure_flight_number || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, departure_flight_number: e.target.value })}
              fullWidth
            />
            <TextField
              label="Departure Airport"
              value={editingTravel?.departure_airport || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, departure_airport: e.target.value })}
              fullWidth
              placeholder="e.g., PDX, OTH"
            />
            <TextField
              label="Departure Notes"
              value={editingTravel?.departure_notes || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, departure_notes: e.target.value })}
              fullWidth
            />

            <Typography variant="subtitle1" sx={{ gridColumn: '1 / -1', fontWeight: 600, mt: 2, borderBottom: '1px solid #ddd', pb: 1 }}>
              Transportation
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={editingTravel?.needs_transportation || false}
                  onChange={(e) => setEditingTravel({ ...editingTravel, needs_transportation: e.target.checked })}
                />
              }
              label="Needs Transportation"
            />
            <TextField
              label="Rental Car Info"
              value={editingTravel?.rental_car_info || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, rental_car_info: e.target.value })}
              fullWidth
            />
            <TextField
              label="General Notes"
              value={editingTravel?.notes || ''}
              onChange={(e) => setEditingTravel({ ...editingTravel, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{ gridColumn: { md: '1 / -1' } }}
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
          Are you sure you want to delete this travel info?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
