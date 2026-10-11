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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { TravelInfo, Event, Player } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import AdminName from '@/components/admin/AdminName';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

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
      supabase.from('travel_info').select('*, event:events(*), player:players(*)').order('arrival_date', { ascending: true }),
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
    const activeEvent = events.find((e) => e.is_active) || events[0];
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

    const { error } = await supabase.from('travel_info').delete().eq('id', travelToDelete.id);

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
      const { error } = await supabase.from('travel_info').update(travelData).eq('id', editingTravel.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Travel info updated successfully');
    } else {
      const { error } = await supabase.from('travel_info').insert([travelData]);

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
    filteredTravel = filteredTravel.filter((t) => t.event_id === selectedEventId);
  }
  if (searchTerm) {
    filteredTravel = filteredTravel.filter((t) =>
      `${t.player?.first_name} ${t.player?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div>
      <AdminHead
        crumb="Travel"
        title="Travel"
        sub="Arrivals, departures, and how everyone is getting there."
        actions={
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleAdd}>
            <AIcon name="plus" size={14} />
            <span>Add Travel Info</span>
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

      <div className={styles.filterRow}>
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
        <TextField
          size="small"
          placeholder="Search by player name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchField}
        />
      </div>

      <div className="ad-card" style={{ overflow: 'hidden' }}>
        <div className={`ad-row head ${styles.travelGrid}`}>
          <span className="ad-th">Player</span>
          <span className="ad-th">Event</span>
          <span className="ad-th">Arrival</span>
          <span className="ad-th">Departure</span>
          <span className="ad-th">Transport</span>
          <span className="ad-th" />
        </div>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={`ad-row ${styles.travelGrid}`}>
              {[45, 30, 50, 50, 30, 0].map((w, j) => (
                <div key={j} className="ad-sk" style={{ width: w ? `${w}%` : 0, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ))
        ) : filteredTravel.length === 0 ? (
          <div className={styles.emptyState}>No travel info found</div>
        ) : (
          filteredTravel.map((travel) => (
            <div key={travel.id} className={`ad-row hover ${styles.travelGrid}`}>
              {travel.player ? (
                <AdminName firstName={travel.player.first_name} lastName={travel.player.last_name} profileImageUrl={travel.player.profile_image_url} />
              ) : (
                <span style={{ color: 'var(--pc-ink-3)' }}>—</span>
              )}
              <span>
                <span className="ad-badge">{travel.event?.name || '—'}</span>
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {formatDate(travel.arrival_date)} {formatTime(travel.arrival_time)}
                </div>
                {travel.arrival_flight_number && (
                  <div style={{ fontSize: 11, color: 'var(--pc-ink-3)', fontFamily: 'var(--pc-font-mono)' }}>
                    {travel.arrival_airline} {travel.arrival_flight_number}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {formatDate(travel.departure_date)} {formatTime(travel.departure_time)}
                </div>
                {travel.departure_flight_number && (
                  <div style={{ fontSize: 11, color: 'var(--pc-ink-3)', fontFamily: 'var(--pc-font-mono)' }}>
                    {travel.departure_airline} {travel.departure_flight_number}
                  </div>
                )}
              </div>
              <span>
                {travel.needs_transportation ? (
                  <span className={styles.badgeWarning}>Needs Ride</span>
                ) : (
                  <span className="ad-badge">Self</span>
                )}
              </span>
              <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <button type="button" className="ad-ib" onClick={() => handleEdit(travel)} aria-label="Edit travel info">
                  <AIcon name="edit" size={16} />
                </button>
                <button type="button" className="ad-ib" onClick={() => handleDelete(travel)} aria-label="Delete travel info">
                  <AIcon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <div>
            <div className="ad-crumb">Travel</div>
            <h2 className={styles.dialogTitle}>{editingTravel?.id ? 'Edit travel info' : 'Add travel info'}</h2>
          </div>
          <button type="button" className="ad-ib" onClick={() => setDialogOpen(false)} aria-label="Close">
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          <div className={styles.formGrid}>
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

            <h3 className={styles.sectionHeading}>Arrival</h3>

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

            <h3 className={styles.sectionHeading}>Departure</h3>

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

            <h3 className={styles.sectionHeading}>Transportation</h3>

            <FormControlLabel
              className={styles.fieldWide}
              control={
                <Switch
                  checked={editingTravel?.needs_transportation || false}
                  onChange={(e) => setEditingTravel({ ...editingTravel, needs_transportation: e.target.checked })}
                />
              }
              label="Needs transportation"
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
              className={styles.fieldWide}
            />
          </div>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleSave}>
            Save travel info
          </button>
        </div>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <h2 className={styles.dialogTitle}>Delete travel info?</h2>
        </div>
        <DialogContent>
          <p style={{ margin: 0, color: 'var(--pc-ink-2)' }}>Are you sure you want to delete this travel info?</p>
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
