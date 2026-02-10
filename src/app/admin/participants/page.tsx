'use client';
import { useState, useEffect } from 'react';
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Event, Player, EventParticipant } from '@/types/database';

type ParticipantWithPlayer = EventParticipant & {
  players: Player;
};

export default function EventParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantWithPlayer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ParticipantWithPlayer | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchEvents();
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchParticipants();
    }
  }, [selectedEvent]);

  async function fetchEvents() {
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
  }

  async function fetchPlayers() {
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
  }

  async function fetchParticipants() {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_participants')
      .select('*, players(*)')
      .eq('event_id', selectedEvent)
      .order('created_at');

    if (error) {
      setError(error.message);
    } else {
      setParticipants(data || []);
    }
    setLoading(false);
  }

  const participantPlayerIds = participants.map((p) => p.player_id);
  const availablePlayers = players.filter((p) => !participantPlayerIds.includes(p.id));

  async function handleSave(formData: FormData) {
    const participantData = {
      event_id: selectedEvent,
      player_id: formData.get('player_id') as string,
      handicap_at_event: formData.get('handicap_at_event') ? Number(formData.get('handicap_at_event')) : null,
      is_confirmed: formData.get('is_confirmed') === 'true',
      notes: formData.get('notes') as string || null,
    };

    if (editingParticipant) {
      const { error } = await supabase
        .from('event_participants')
        .update(participantData)
        .eq('id', editingParticipant.id);

      if (error) {
        setError(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('event_participants').insert(participantData);

      if (error) {
        setError(error.message);
        return;
      }
    }

    setDialogOpen(false);
    setEditingParticipant(null);
    fetchParticipants();
  }

  async function handleBulkAdd() {
    if (selectedPlayers.length === 0) return;

    const newParticipants = selectedPlayers.map((playerId) => {
      const player = players.find((p) => p.id === playerId);
      return {
        event_id: selectedEvent,
        player_id: playerId,
        handicap_at_event: player?.current_handicap || null,
        is_confirmed: false,
      };
    });

    const { error } = await supabase.from('event_participants').insert(newParticipants);

    if (error) {
      setError(error.message);
      return;
    }

    setBulkDialogOpen(false);
    setSelectedPlayers([]);
    fetchParticipants();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this participant?')) return;

    const { error } = await supabase.from('event_participants').delete().eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }

    fetchParticipants();
  }

  async function handleToggleConfirmed(participant: ParticipantWithPlayer) {
    const { error } = await supabase
      .from('event_participants')
      .update({ is_confirmed: !participant.is_confirmed })
      .eq('id', participant.id);

    if (error) {
      setError(error.message);
      return;
    }

    fetchParticipants();
  }

  const currentEvent = events.find((e) => e.id === selectedEvent);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Event Participants
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={() => setBulkDialogOpen(true)}
            disabled={availablePlayers.length === 0}
          >
            Bulk Add
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            disabled={availablePlayers.length === 0}
          >
            Add Participant
          </Button>
        </Box>
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
        {currentEvent && (
          <Typography variant="body2" sx={{ color: '#666' }}>
            {participants.length} participants | {participants.filter((p) => p.is_confirmed).length} confirmed
          </Typography>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 600 }}>Player</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Handicap at Event</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No participants for this event
                </TableCell>
              </TableRow>
            ) : (
              participants.map((participant) => (
                <TableRow key={participant.id} hover>
                  <TableCell>
                    {participant.players.first_name} {participant.players.last_name}
                  </TableCell>
                  <TableCell>{participant.players.email}</TableCell>
                  <TableCell>{participant.handicap_at_event ?? '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={participant.is_confirmed ? 'Confirmed' : 'Pending'}
                      size="small"
                      color={participant.is_confirmed ? 'success' : 'warning'}
                      onClick={() => handleToggleConfirmed(participant)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </TableCell>
                  <TableCell>{participant.notes || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingParticipant(participant);
                        setDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(participant.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => {setDialogOpen(false); setEditingParticipant(null);}} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }}
        >
          <DialogTitle>{editingParticipant ? 'Edit Participant' : 'Add Participant'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {!editingParticipant && (
                <FormControl fullWidth required>
                  <InputLabel>Player</InputLabel>
                  <Select name="player_id" label="Player" defaultValue="">
                    {availablePlayers.map((player) => (
                      <MenuItem key={player.id} value={player.id}>
                        {player.first_name} {player.last_name} (Hdcp: {player.current_handicap ?? 'N/A'})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {editingParticipant && (
                <>
                  <input type="hidden" name="player_id" value={editingParticipant.player_id} />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {editingParticipant.players.first_name} {editingParticipant.players.last_name}
                  </Typography>
                </>
              )}
              <TextField
                name="handicap_at_event"
                label="Handicap at Event"
                type="number"
                inputProps={{ step: '0.1' }}
                defaultValue={editingParticipant?.handicap_at_event || ''}
              />
              <FormControl fullWidth>
                <InputLabel>Confirmed</InputLabel>
                <Select
                  name="is_confirmed"
                  label="Confirmed"
                  defaultValue={editingParticipant?.is_confirmed ? 'true' : 'false'}
                >
                  <MenuItem value="false">Pending</MenuItem>
                  <MenuItem value="true">Confirmed</MenuItem>
                </Select>
              </FormControl>
              <TextField
                name="notes"
                label="Notes"
                multiline
                rows={2}
                defaultValue={editingParticipant?.notes || ''}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {setDialogOpen(false); setEditingParticipant(null);}}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => {setBulkDialogOpen(false); setSelectedPlayers([]);}} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Add Participants</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            Select players to add to {currentEvent?.name}. Their current handicap will be used as the event handicap.
          </Typography>
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {availablePlayers.map((player) => (
              <FormControlLabel
                key={player.id}
                control={
                  <Checkbox
                    checked={selectedPlayers.includes(player.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlayers([...selectedPlayers, player.id]);
                      } else {
                        setSelectedPlayers(selectedPlayers.filter((id) => id !== player.id));
                      }
                    }}
                  />
                }
                label={`${player.first_name} ${player.last_name} (Hdcp: ${player.current_handicap ?? 'N/A'})`}
                sx={{ display: 'block' }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {setBulkDialogOpen(false); setSelectedPlayers([]);}}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkAdd}
            disabled={selectedPlayers.length === 0}
          >
            Add {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
