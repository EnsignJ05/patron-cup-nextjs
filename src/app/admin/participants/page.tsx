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
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Event, Player, EventParticipant } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import AdminName from '@/components/admin/AdminName';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

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

  const fetchParticipants = useCallback(async () => {
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
  }, [selectedEvent, supabase]);

  useEffect(() => {
    fetchEvents();
    fetchPlayers();
  }, [fetchEvents, fetchPlayers]);

  useEffect(() => {
    if (selectedEvent) {
      fetchParticipants();
    }
  }, [selectedEvent, fetchParticipants]);

  const participantPlayerIds = participants.map((p) => p.player_id);
  const availablePlayers = players.filter((p) => !participantPlayerIds.includes(p.id));

  async function handleSave(formData: FormData) {
    const participantData = {
      event_id: selectedEvent,
      player_id: formData.get('player_id') as string,
      status: formData.get('status') as string,
      notes: (formData.get('notes') as string) || null,
    };

    if (editingParticipant) {
      const { error } = await supabase.from('event_participants').update(participantData).eq('id', editingParticipant.id);

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

    const newParticipants = selectedPlayers.map((playerId) => ({
      event_id: selectedEvent,
      player_id: playerId,
      status: 'registered',
    }));

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
      .update({ status: participant.status === 'confirmed' ? 'registered' : 'confirmed' })
      .eq('id', participant.id);

    if (error) {
      setError(error.message);
      return;
    }

    fetchParticipants();
  }

  const currentEvent = events.find((e) => e.id === selectedEvent);

  return (
    <div>
      <AdminHead
        crumb="Participants"
        title="Participants"
        sub={
          currentEvent
            ? `${participants.length} participant${participants.length === 1 ? '' : 's'} · ${participants.filter((p) => p.status === 'confirmed').length} confirmed`
            : undefined
        }
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
            <button
              type="button"
              className="pc-d-actionbtn"
              disabled={availablePlayers.length === 0}
              onClick={() => setBulkDialogOpen(true)}
            >
              <AIcon name="participants" size={14} />
              <span>Bulk Add</span>
            </button>
            <button
              type="button"
              className="pc-d-actionbtn"
              data-primary="true"
              disabled={availablePlayers.length === 0}
              onClick={() => setDialogOpen(true)}
            >
              <AIcon name="plus" size={14} />
              <span>Add Participant</span>
            </button>
          </>
        }
      />

      {error && (
        <Alert severity="error" className={styles.alert} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="ad-card" style={{ overflow: 'hidden' }}>
        <div className={`ad-row head ${styles.participantGrid}`}>
          <span className="ad-th">Player</span>
          <span className="ad-th">Email</span>
          <span className="ad-th" style={{ textAlign: 'right' }}>Handicap</span>
          <span className="ad-th">Status</span>
          <span className="ad-th">Notes</span>
          <span className="ad-th" />
        </div>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={`ad-row ${styles.participantGrid}`}>
              {[50, 55, 20, 30, 35, 0].map((w, j) => (
                <div key={j} className="ad-sk" style={{ width: w ? `${w}%` : 0, marginLeft: j === 2 ? 'auto' : 0, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ))
        ) : participants.length === 0 ? (
          <div className={styles.emptyState}>No participants for this event</div>
        ) : (
          participants.map((participant) => (
            <div key={participant.id} className={`ad-row hover ${styles.participantGrid}`}>
              <AdminName
                firstName={participant.players.first_name}
                lastName={participant.players.last_name}
                profileImageUrl={participant.players.profile_image_url}
              />
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>{participant.players.email}</span>
              <span className="ad-num">{participant.players.current_handicap ?? '—'}</span>
              <span>
                <button
                  type="button"
                  className="ad-chip"
                  data-on={participant.status === 'confirmed'}
                  onClick={() => handleToggleConfirmed(participant)}
                >
                  {participant.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                </button>
              </span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>{participant.notes || '—'}</span>
              <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <button
                  type="button"
                  className="ad-ib"
                  onClick={() => {
                    setEditingParticipant(participant);
                    setDialogOpen(true);
                  }}
                  aria-label="Edit participant"
                >
                  <AIcon name="edit" size={16} />
                </button>
                <button type="button" className="ad-ib" onClick={() => handleDelete(participant.id)} aria-label="Remove participant">
                  <AIcon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingParticipant(null);
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
              <div className="ad-crumb">Participants</div>
              <h2 className={styles.dialogTitle}>{editingParticipant ? 'Edit participant' : 'Add participant'}</h2>
            </div>
            <button
              type="button"
              className="ad-ib"
              onClick={() => {
                setDialogOpen(false);
                setEditingParticipant(null);
              }}
              aria-label="Close"
            >
              <AIcon name="x" size={18} />
            </button>
          </div>
          <DialogContent>
            <div className={styles.formFields}>
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
                  <AdminName
                    firstName={editingParticipant.players.first_name}
                    lastName={editingParticipant.players.last_name}
                    profileImageUrl={editingParticipant.players.profile_image_url}
                  />
                </>
              )}
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select name="status" label="Status" defaultValue={editingParticipant?.status || 'registered'}>
                  <MenuItem value="registered">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                </Select>
              </FormControl>
              <TextField name="notes" label="Notes" multiline rows={2} defaultValue={editingParticipant?.notes || ''} />
            </div>
          </DialogContent>
          <div className="ad-dlg-f">
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="pc-d-actionbtn"
              onClick={() => {
                setDialogOpen(false);
                setEditingParticipant(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="pc-d-actionbtn" data-primary="true">
              Save participant
            </button>
          </div>
        </form>
      </Dialog>

      {/* Bulk add */}
      <Dialog
        open={bulkDialogOpen}
        onClose={() => {
          setBulkDialogOpen(false);
          setSelectedPlayers([]);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: 'ad-dlg' }}
      >
        <div className="ad-dlg-h">
          <div>
            <div className="ad-crumb">Participants</div>
            <h2 className={styles.dialogTitle}>Bulk add participants</h2>
            <p className="ad-sub">Select players to add to {currentEvent?.name}.</p>
          </div>
          <button
            type="button"
            className="ad-ib"
            onClick={() => {
              setBulkDialogOpen(false);
              setSelectedPlayers([]);
            }}
            aria-label="Close"
          >
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          <div className={styles.bulkList}>
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
                className={styles.bulkItem}
              />
            ))}
          </div>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="pc-d-actionbtn"
            onClick={() => {
              setBulkDialogOpen(false);
              setSelectedPlayers([]);
            }}
          >
            Cancel
          </button>
          <button type="button" className="pc-d-actionbtn" data-primary="true" disabled={selectedPlayers.length === 0} onClick={handleBulkAdd}>
            Add {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? 's' : ''}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
