'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Lodging, LodgingAssignment, Event, Player } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

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
  const [, setAssignments] = useState<(LodgingAssignment & { player?: Player })[]>([]);
  const [slotDrafts, setSlotDrafts] = useState<SlotDraft[]>([]);
  const [initialSlotDrafts, setInitialSlotDrafts] = useState<SlotDraft[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [lodgingsRes, eventsRes, playersRes] = await Promise.all([
      supabase.from('lodging').select('*, event:events(*)').order('building_name'),
      supabase.from('events').select('*').order('year', { ascending: false }),
      // NOTE: is_active, not status -- same known split-brain bug as admin/travel (Part IV
      // Task H3), unchanged here, out of scope for a visual redesign.
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
    const activeEvent = events.find((e) => e.is_active) || events[0];
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

    const { error } = await supabase.from('lodging').delete().eq('id', lodgingToDelete.id);

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
      const { error } = await supabase.from('lodging').update(lodgingData).eq('id', editingLodging.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Lodging updated successfully');
    } else {
      const { error } = await supabase.from('lodging').insert([lodgingData]);

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

    const { data, error } = await supabase.from('lodging_assignments').select('*, player:players(*)').eq('lodging_id', lodging.id);

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
      prev.map((slot, index) => (index === slotIndex ? { ...slot, assignmentId: null, playerId: '', confirmationNum: '', isPrimary: false } : slot)),
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

    const { error: deleteError } = await supabase.from('lodging_assignments').delete().eq('lodging_id', selectedLodging.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (payload.length > 0) {
      const { error: insertError } = await supabase.from('lodging_assignments').insert(payload);
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    setSuccess('Room assignments saved');
    openAssignmentsDialog(selectedLodging);
  };

  const togglePrimary = (slotIndex: number) => {
    setSlotDrafts((prev) => prev.map((slot, index) => (index === slotIndex ? { ...slot, isPrimary: !slot.isPrimary } : slot)));
  };

  const filteredLodgings = selectedEventId ? lodgings.filter((l) => l.event_id === selectedEventId) : lodgings;

  const getSelectablePlayersForSlot = (slotIndex: number) => {
    const takenPlayerIds = new Set(
      slotDrafts
        .filter((_, index) => index !== slotIndex)
        .map((slot) => slot.playerId)
        .filter(Boolean),
    );
    return players.filter((player) => !takenPlayerIds.has(player.id));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
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
    <div>
      <AdminHead
        crumb="Lodging"
        title="Lodging"
        sub="Rooms, roommates, and confirmations."
        actions={
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleAdd}>
            <AIcon name="plus" size={14} />
            <span>Add Room</span>
          </button>
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

      <div className="ad-card" style={{ overflow: 'hidden' }}>
        <div className={`ad-row head ${styles.lodgingGrid}`}>
          <span className="ad-th">Building / Room</span>
          <span className="ad-th">Type</span>
          <span className="ad-th" style={{ textAlign: 'right' }}>Beds</span>
          <span className="ad-th" style={{ textAlign: 'right' }}>People</span>
          <span className="ad-th">Event</span>
          <span className="ad-th">Dates</span>
          <span className="ad-th" />
        </div>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={`ad-row ${styles.lodgingGrid}`}>
              {[55, 35, 20, 20, 35, 45, 0].map((w, j) => (
                <div key={j} className="ad-sk" style={{ width: w ? `${w}%` : 0, marginLeft: j === 2 || j === 3 ? 'auto' : 0, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ))
        ) : filteredLodgings.length === 0 ? (
          <div className={styles.emptyState}>No lodging found</div>
        ) : (
          filteredLodgings.map((lodging) => (
            <div key={lodging.id} className={`ad-row hover ${styles.lodgingGrid}`}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {lodging.building_name || '—'}
                {lodging.room_number ? ` · ${lodging.room_number}` : ''}
              </span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>{lodging.room_type || '—'}</span>
              <span className="ad-num">{lodging.bedrooms ?? '—'}</span>
              <span className="ad-num">{lodging.num_of_people ?? '—'}</span>
              <span>
                <span className="ad-badge">{lodging.event?.name || '—'}</span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--pc-ink-3)', fontFamily: 'var(--pc-font-mono)' }}>
                {formatDate(lodging.check_in_date)} – {formatDate(lodging.check_out_date)}
              </span>
              <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <button type="button" className="ad-ib" onClick={() => openAssignmentsDialog(lodging)} aria-label="Manage guests">
                  <AIcon name="participants" size={16} />
                </button>
                <button type="button" className="ad-ib" onClick={() => handleEdit(lodging)} aria-label="Edit room">
                  <AIcon name="edit" size={16} />
                </button>
                <button type="button" className="ad-ib" onClick={() => handleDelete(lodging)} aria-label="Delete room">
                  <AIcon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Room */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <div>
            <div className="ad-crumb">Lodging</div>
            <h2 className={styles.dialogTitle}>{editingLodging?.id ? 'Edit room' : 'Add room'}</h2>
          </div>
          <button type="button" className="ad-ib" onClick={() => setDialogOpen(false)} aria-label="Close">
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          <div className={styles.formFields}>
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
              onChange={(e) =>
                setEditingLodging({
                  ...editingLodging,
                  bedrooms: e.target.value === '' ? null : Number(e.target.value),
                })
              }
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
              onChange={(e) =>
                setEditingLodging({
                  ...editingLodging,
                  num_of_people: e.target.value === '' ? null : Number(e.target.value),
                })
              }
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
          </div>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
          <button type="button" className="pc-d-actionbtn" data-primary="true" disabled={hasValidationErrors} onClick={handleSave}>
            Save room
          </button>
        </div>
      </Dialog>

      {/* Assignments */}
      <Dialog
        open={assignmentsDialogOpen}
        onClose={() => setAssignmentsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: 'ad-dlg' }}
      >
        <div className="ad-dlg-h">
          <div>
            <div className="ad-crumb">Lodging</div>
            <h2 className={styles.dialogTitle}>
              {selectedLodging?.building_name} {selectedLodging?.room_number}
            </h2>
            <p className="ad-sub">
              Guests ({slotDrafts.filter((slot) => Boolean(slot.playerId)).length}/{selectedLodging?.num_of_people ?? 0})
            </p>
          </div>
          <button type="button" className="ad-ib" onClick={() => setAssignmentsDialogOpen(false)} aria-label="Close">
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          {slotDrafts.length === 0 ? (
            <p style={{ color: 'var(--pc-ink-3)', fontSize: 13 }}>This room has zero slots. Increase People on the room first.</p>
          ) : (
            <div className="ad-card" style={{ overflow: 'hidden' }}>
              <div className={`ad-row head ${styles.slotGrid}`}>
                <span className="ad-th">Slot</span>
                <span className="ad-th">Player</span>
                <span className="ad-th">Confirmation #</span>
                <span className="ad-th">Primary</span>
                <span className="ad-th" />
              </div>
              {slotDrafts.map((slot, slotIndex) => (
                <div key={slot.assignmentId ?? `slot-${slotIndex}`} className={`ad-row ${styles.slotGrid}`}>
                  <span className="ad-num" style={{ textAlign: 'left' }}>{slotIndex + 1}</span>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Player</InputLabel>
                    <Select
                      value={slot.playerId}
                      label="Player"
                      onChange={(e) =>
                        setSlotDrafts((prev) =>
                          prev.map((currentSlot, index) => (index === slotIndex ? { ...currentSlot, playerId: e.target.value } : currentSlot)),
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
                  <TextField
                    size="small"
                    placeholder="Optional"
                    value={slot.confirmationNum}
                    onChange={(e) =>
                      setSlotDrafts((prev) =>
                        prev.map((currentSlot, index) => (index === slotIndex ? { ...currentSlot, confirmationNum: e.target.value } : currentSlot)),
                      )
                    }
                  />
                  <span>
                    {slot.playerId ? (
                      <button
                        type="button"
                        className="ad-chip"
                        data-on={slot.isPrimary}
                        onClick={() => togglePrimary(slotIndex)}
                      >
                        {slot.isPrimary ? 'Primary' : 'Guest'}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--pc-ink-3)' }}>—</span>
                    )}
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="ad-ib" onClick={() => clearSlotAssignment(slotIndex)} aria-label="Clear slot">
                      <AIcon name="trash" size={16} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setAssignmentsDialogOpen(false)}>
            Close
          </button>
          <button
            type="button"
            className="pc-d-actionbtn"
            data-primary="true"
            disabled={!hasUnsavedAssignmentChanges}
            onClick={saveAllAssignments}
          >
            Save changes
          </button>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <h2 className={styles.dialogTitle}>Delete room?</h2>
        </div>
        <DialogContent>
          <p style={{ margin: 0, color: 'var(--pc-ink-2)' }}>Are you sure you want to delete this room?</p>
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
