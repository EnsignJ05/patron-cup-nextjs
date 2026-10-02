'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Event } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

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

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*').order('year', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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

    const { error } = await supabase.from('events').delete().eq('id', eventToDelete.id);

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
      const { error } = await supabase.from('events').update(eventData).eq('id', editingEvent.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Event updated successfully');
    } else {
      const { error } = await supabase.from('events').insert([eventData]);

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
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div>
      <AdminHead
        crumb="Events"
        title="Events"
        sub={`${events.length} event${events.length === 1 ? '' : 's'}.`}
        actions={
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleAdd}>
            <AIcon name="plus" size={14} />
            <span>Add Event</span>
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

      <div className="ad-card" style={{ overflow: 'hidden' }}>
        <div className={`ad-row head ${styles.eventGrid}`}>
          <span className="ad-th">Name</span>
          <span className="ad-th">Location</span>
          <span className="ad-th">Resort</span>
          <span className="ad-th">Dates</span>
          <span className="ad-th">Status</span>
          <span className="ad-th" />
        </div>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={`ad-row ${styles.eventGrid}`}>
              {[55, 45, 40, 50, 30, 0].map((w, j) => (
                <div key={j} className="ad-sk" style={{ width: w ? `${w}%` : 0, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ))
        ) : events.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <AIcon name="events" size={24} />
            </div>
            <div className={styles.emptyTitle}>No events yet</div>
            <div className={styles.emptyBody}>Create an event to start scheduling courses, teams, and matches.</div>
            <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleAdd}>
              <AIcon name="plus" size={14} />
              <span>Add Event</span>
            </button>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className={`ad-row hover ${styles.eventGrid}`}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {event.name} <span style={{ color: 'var(--pc-ink-3)', fontWeight: 400 }}>({event.year})</span>
              </span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>
                {event.location_city}, {event.location_state}
              </span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>{event.resort_name || '—'}</span>
              <span style={{ fontSize: 12, color: 'var(--pc-ink-3)', fontFamily: 'var(--pc-font-mono)' }}>
                {formatDate(event.start_date)} – {formatDate(event.end_date)}
              </span>
              <span>
                {event.is_active ? (
                  <span className={styles.statusActive}>
                    <span className={styles.statusDot} />
                    Active
                  </span>
                ) : (
                  <span className="ad-badge">Inactive</span>
                )}
              </span>
              <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <button type="button" className="ad-ib" onClick={() => handleEdit(event)} aria-label={`Edit ${event.name}`}>
                  <AIcon name="edit" size={16} />
                </button>
                <button type="button" className="ad-ib" onClick={() => handleDelete(event)} aria-label={`Delete ${event.name}`}>
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
            <div className="ad-crumb">Events</div>
            <h2 className={styles.dialogTitle}>{editingEvent?.id ? 'Edit event' : 'Add event'}</h2>
          </div>
          <button type="button" className="ad-ib" onClick={() => setDialogOpen(false)} aria-label="Close">
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          <div className={styles.formGrid}>
            <TextField
              label="Event Name"
              value={editingEvent?.name || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
              required
              fullWidth
              placeholder="e.g., Patron Cup 2025"
              className={styles.fieldWide}
            />
            <TextField
              label="Year"
              type="number"
              value={editingEvent?.year || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, year: parseInt(e.target.value, 10) })}
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
              className={styles.fieldWide}
            />
            <TextField
              label="Description"
              value={editingEvent?.description || ''}
              onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              className={styles.fieldWide}
            />
            <FormControlLabel
              className={styles.fieldWide}
              control={
                <Switch
                  checked={editingEvent?.is_active || false}
                  onChange={(e) => setEditingEvent({ ...editingEvent, is_active: e.target.checked })}
                />
              }
              label="Active event (current/upcoming)"
            />
          </div>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleSave}>
            Save event
          </button>
        </div>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <h2 className={styles.dialogTitle}>Delete event?</h2>
        </div>
        <DialogContent>
          <p style={{ margin: 0, color: 'var(--pc-ink-2)' }}>
            Are you sure you want to delete {eventToDelete?.name}? This will also delete all associated teams,
            matches, and other data.
          </p>
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
