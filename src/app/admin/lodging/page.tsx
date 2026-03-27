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
import FormHelperText from '@mui/material/FormHelperText';
import Chip from '@mui/material/Chip';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Lodging, LodgingAssignment, Event, Player } from '@/types/database';

export default function LodgingAdminPage() {
  type SlotDraft = {
    assignmentId: string | null;
    playerId: string;
    confirmationNum: string;
    isPrimary: boolean;
  };

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
  const [slotDrafts, setSlotDrafts] = useState<SlotDraft[]>([]);
  const [initialSlotDrafts, setInitialSlotDrafts] = useState<SlotDraft[]>([]);

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
    if (hasValidationErrors) {
      setError('Please fix the form validation errors before saving.');
      return;
    }

    const lodgingData = {
      event_id: editingLodging.event_id,
      building_name: editingLodging.building_name || null,
      room_number: editingLodging.room_number || null,
      room_type: editingLodging.room_type || null,
      check_in_date: editingLodging.check_in_date || null,
      check_out_date: editingLodging.check_out_date || null,
      bedrooms: editingLodging.bedrooms ?? null,
      num_of_people: editingLodging.num_of_people ?? null,
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
      const assignmentRows = data || [];
      setAssignments(assignmentRows);
      const roomCapacity = Math.max(lodging.num_of_people ?? 0, assignmentRows.length);
      const drafts: SlotDraft[] = Array.from({ length: roomCapacity }, (_, index) => {
        const assignment = assignmentRows[index];
        if (!assignment) {
          return {
            assignmentId: null,
            playerId: '',
            confirmationNum: '',
            isPrimary: false,
          };
        }
        return {
          assignmentId: assignment.id,
          playerId: assignment.player_id,
          confirmationNum: assignment.confirmation_num || '',
          isPrimary: assignment.is_primary,
        };
      });
      setSlotDrafts(drafts);
      setInitialSlotDrafts(drafts);
    }
  };

  const clearSlotAssignment = (slotIndex: number) => {
    const draft = slotDrafts[slotIndex];
    if (!draft) return;
    setSlotDrafts((prev) =>
      prev.map((slot, index) =>
        index === slotIndex
          ? { ...slot, assignmentId: null, playerId: '', confirmationNum: '', isPrimary: false }
          : slot
      )
    );
  };

  const saveAllAssignments = async () => {
    if (!selectedLodging) return;

    const selectedPlayers = slotDrafts.map((slot) => slot.playerId).filter(Boolean);
    const uniquePlayers = new Set(selectedPlayers);
    if (selectedPlayers.length !== uniquePlayers.size) {
      setError('A player can only be assigned to one slot in this room.');
      return;
    }

    const payload = slotDrafts
      .filter((slot) => Boolean(slot.playerId))
      .map((slot) => ({
        lodging_id: selectedLodging.id,
        player_id: slot.playerId,
        confirmation_num: slot.confirmationNum.trim() || null,
        is_primary: slot.isPrimary,
      }));

    const { error: deleteError } = await supabase
      .from('lodging_assignments')
      .delete()
      .eq('lodging_id', selectedLodging.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (payload.length > 0) {
      const { error: insertError } = await supabase
        .from('lodging_assignments')
        .insert(payload);
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    setSuccess('Room assignments saved');
    openAssignmentsDialog(selectedLodging);
  };

  const togglePrimary = (slotIndex: number) => {
    setSlotDrafts((prev) =>
      prev.map((slot, index) =>
        index === slotIndex
          ? { ...slot, isPrimary: !slot.isPrimary }
          : slot
      )
    );
  };

  const filteredLodgings = selectedEventId 
    ? lodgings.filter(l => l.event_id === selectedEventId)
    : lodgings;

  const getSelectablePlayersForSlot = (slotIndex: number) => {
    const takenPlayerIds = new Set(
      slotDrafts
        .filter((_, index) => index !== slotIndex)
        .map((slot) => slot.playerId)
        .filter(Boolean)
    );
    return players.filter((player) => !takenPlayerIds.has(player.id));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const validationErrors = useMemo(() => {
    const errors: Partial<Record<'event_id' | 'bedrooms' | 'num_of_people', string>> = {};
    const bedrooms = editingLodging?.bedrooms;
    const numOfPeople = editingLodging?.num_of_people;

    if (!editingLodging?.event_id) {
      errors.event_id = 'Event is required';
    }

    if (bedrooms === null || bedrooms === undefined) {
      errors.bedrooms = 'Bedrooms is required';
    } else if (!Number.isInteger(bedrooms) || bedrooms < 0) {
      errors.bedrooms = 'Bedrooms must be a non-negative whole number';
    }

    if (numOfPeople === null || numOfPeople === undefined) {
      errors.num_of_people = 'Number of people is required';
    } else if (!Number.isInteger(numOfPeople) || numOfPeople < 0) {
      errors.num_of_people = 'Number of people must be a non-negative whole number';
    }

    return errors;
  }, [editingLodging]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const hasUnsavedAssignmentChanges = useMemo(() => {
    const normalizeDrafts = (drafts: SlotDraft[]) =>
      drafts.map((draft) => ({
        playerId: draft.playerId,
        confirmationNum: draft.confirmationNum.trim(),
        isPrimary: draft.isPrimary && Boolean(draft.playerId),
      }));

    return JSON.stringify(normalizeDrafts(slotDrafts)) !== JSON.stringify(normalizeDrafts(initialSlotDrafts));
  }, [slotDrafts, initialSlotDrafts]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text)' }}>
          Lodging Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: 'var(--text)', color: 'var(--bg)' }}
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
            <TableRow sx={{ bgcolor: 'var(--text)' }}>
              <TableCell sx={{ color: 'var(--bg)', fontWeight: 600 }}>Building</TableCell>
              <TableCell sx={{ color: 'var(--bg)', fontWeight: 600 }}>Room #</TableCell>
              <TableCell sx={{ color: 'var(--bg)', fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ color: 'var(--bg)', fontWeight: 600 }}>Bedrooms</TableCell>
              <TableCell sx={{ color: 'var(--bg)', fontWeight: 600 }}>People</TableCell>
              <TableCell sx={{ color: 'var(--bg)', fontWeight: 600 }}>Event</TableCell>
              <TableCell sx={{ color: 'var(--bg)', fontWeight: 600 }}>Dates</TableCell>
              <TableCell sx={{ color: 'var(--bg)', fontWeight: 600 }}>Notes</TableCell>
              <TableCell sx={{ color: 'var(--bg)', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredLodgings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">No lodging found</TableCell>
              </TableRow>
            ) : (
              filteredLodgings.map((lodging) => (
                <TableRow key={lodging.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{lodging.building_name || '-'}</TableCell>
                  <TableCell>{lodging.room_number || '-'}</TableCell>
                  <TableCell>{lodging.room_type || '-'}</TableCell>
                  <TableCell>{lodging.bedrooms ?? '-'}</TableCell>
                  <TableCell>{lodging.num_of_people ?? '-'}</TableCell>
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
            <FormControl fullWidth required error={Boolean(validationErrors.event_id)}>
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
              <FormHelperText>{validationErrors.event_id}</FormHelperText>
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
              label="Bedrooms"
              type="number"
              value={editingLodging?.bedrooms ?? ''}
              onChange={(e) => setEditingLodging({
                ...editingLodging,
                bedrooms: e.target.value === '' ? null : Number(e.target.value),
              })}
              fullWidth
              required
              error={Boolean(validationErrors.bedrooms)}
              helperText={validationErrors.bedrooms}
              inputProps={{ min: 0, step: 1 }}
            />
            <TextField
              label="Number of People"
              type="number"
              value={editingLodging?.num_of_people ?? ''}
              onChange={(e) => setEditingLodging({
                ...editingLodging,
                num_of_people: e.target.value === '' ? null : Number(e.target.value),
              })}
              fullWidth
              required
              error={Boolean(validationErrors.num_of_people)}
              helperText={validationErrors.num_of_people}
              inputProps={{ min: 0, step: 1 }}
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
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={hasValidationErrors}
            sx={{ bgcolor: 'var(--text)', color: 'var(--bg)' }}
          >
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
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Guests ({slotDrafts.filter((slot) => Boolean(slot.playerId)).length}/{selectedLodging?.num_of_people ?? 0})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Slot</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell>Confirmation #</TableCell>
                  <TableCell>Primary</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slotDrafts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">This room has zero slots. Increase People on the room first.</TableCell>
                  </TableRow>
                ) : (
                  slotDrafts.map((slot, slotIndex) => (
                    <TableRow key={slot.assignmentId ?? `slot-${slotIndex}`}>
                      <TableCell>{slotIndex + 1}</TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Player</InputLabel>
                          <Select
                            value={slot.playerId}
                            label="Player"
                            onChange={(e) =>
                              setSlotDrafts((prev) =>
                                prev.map((currentSlot, index) =>
                                  index === slotIndex
                                    ? { ...currentSlot, playerId: e.target.value }
                                    : currentSlot
                                )
                              )
                            }
                          >
                            <MenuItem value="">
                              <em>Empty slot</em>
                            </MenuItem>
                            {getSelectablePlayersForSlot(slotIndex).map((player) => (
                              <MenuItem key={player.id} value={player.id}>
                                {player.first_name} {player.last_name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          label="Confirmation #"
                          value={slot.confirmationNum}
                          placeholder="Optional"
                          onChange={(e) =>
                            setSlotDrafts((prev) =>
                              prev.map((currentSlot, index) =>
                                index === slotIndex
                                  ? { ...currentSlot, confirmationNum: e.target.value }
                                  : currentSlot
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {slot.playerId ? (
                          <Chip
                            label={slot.isPrimary ? 'Primary' : 'Guest'}
                            size="small"
                            color={slot.isPrimary ? 'primary' : 'default'}
                            onClick={() => togglePrimary(slotIndex)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => clearSlotAssignment(slotIndex)}
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
          <Button
            onClick={saveAllAssignments}
            variant="contained"
            disabled={!hasUnsavedAssignmentChanges}
            sx={{ bgcolor: 'var(--text)', color: 'var(--bg)' }}
          >
            Save Changes
          </Button>
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
