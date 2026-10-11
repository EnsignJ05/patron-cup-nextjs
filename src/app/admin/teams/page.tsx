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
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Team, Event, Player, TeamRoster } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import AdminName from '@/components/admin/AdminName';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

export default function TeamsAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [teams, setTeams] = useState<(Team & { event: Event })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Partial<Team> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Roster management
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<(TeamRoster & { player: Player })[]>([]);
  const [captainPlayerIds, setCaptainPlayerIds] = useState<Set<string>>(new Set());
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [handicapAtEvent, setHandicapAtEvent] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [teamsRes, eventsRes, playersRes] = await Promise.all([
      supabase.from('teams').select('*, event:events(*)').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('players').select('*').eq('is_active', true).order('last_name'),
    ]);

    if (teamsRes.error) setError(teamsRes.error.message);
    else setTeams(teamsRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (playersRes.data) setPlayers(playersRes.data);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    setEditingTeam({ event_id: selectedEventId || events[0]?.id, name: '', color: '' });
    setDialogOpen(true);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam({ ...team });
    setDialogOpen(true);
  };

  const handleDelete = (team: Team) => {
    setTeamToDelete(team);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!teamToDelete) return;

    const { error } = await supabase.from('teams').delete().eq('id', teamToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Team deleted successfully');
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setTeamToDelete(null);
  };

  const handleSave = async () => {
    if (!editingTeam) return;
    setError('');

    const teamData = {
      event_id: editingTeam.event_id,
      name: editingTeam.name,
      color: editingTeam.color || null,
      logo_url: editingTeam.logo_url || null,
    };

    if (editingTeam.id) {
      const { error } = await supabase.from('teams').update(teamData).eq('id', editingTeam.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Team updated successfully');
    } else {
      const { error } = await supabase.from('teams').insert([teamData]);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Team added successfully');
    }

    setDialogOpen(false);
    setEditingTeam(null);
    fetchData();
  };

  // Roster management functions
  const openRosterDialog = async (team: Team) => {
    setSelectedTeam(team);
    setRosterDialogOpen(true);

    const [rosterRes, captainsRes] = await Promise.all([
      supabase.from('team_rosters').select('*, player:players(*)').eq('team_id', team.id),
      supabase.from('team_captains').select('player_id').eq('team_id', team.id),
    ]);

    if (rosterRes.error) {
      setError(rosterRes.error.message);
    } else {
      setRoster(rosterRes.data || []);
    }
    setCaptainPlayerIds(new Set((captainsRes.data || []).map((c: { player_id: string }) => c.player_id)));
  };

  const addToRoster = async () => {
    if (!selectedTeam || !selectedPlayerId) return;

    const { error } = await supabase.from('team_rosters').insert([
      {
        team_id: selectedTeam.id,
        player_id: selectedPlayerId,
        handicap_at_event: handicapAtEvent ? parseFloat(handicapAtEvent) : null,
      },
    ]);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player added to roster');
      setSelectedPlayerId('');
      setHandicapAtEvent('');
      openRosterDialog(selectedTeam);
    }
  };

  const removeFromRoster = async (rosterEntry: TeamRoster & { player: Player }) => {
    const { error } = await supabase.from('team_rosters').delete().eq('id', rosterEntry.id);

    if (error) {
      setError(error.message);
      return;
    }

    // Also drop any captain designation -- a player off the roster can't stay captain.
    if (selectedTeam && captainPlayerIds.has(rosterEntry.player_id)) {
      await supabase.from('team_captains').delete().eq('team_id', selectedTeam.id).eq('player_id', rosterEntry.player_id);
    }

    setSuccess('Player removed from roster');
    if (selectedTeam) openRosterDialog(selectedTeam);
  };

  const toggleCaptain = async (playerId: string) => {
    if (!selectedTeam) return;
    setError('');

    if (captainPlayerIds.has(playerId)) {
      const { error } = await supabase.from('team_captains').delete().eq('team_id', selectedTeam.id).eq('player_id', playerId);
      if (error) {
        setError(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('team_captains').insert({ team_id: selectedTeam.id, player_id: playerId, is_primary: false });
      if (error) {
        setError(error.message);
        return;
      }
    }

    setCaptainPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const filteredTeams = selectedEventId ? teams.filter((t) => t.event_id === selectedEventId) : teams;

  const availablePlayers = players.filter((p) => !roster.some((r) => r.player_id === p.id));

  return (
    <div>
      <AdminHead
        crumb="Teams"
        title="Teams"
        sub="Rosters and captains."
        actions={
          <>
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
            <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleAdd}>
              <AIcon name="plus" size={14} />
              <span>Add Team</span>
            </button>
          </>
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
        <div className={`ad-row head ${styles.teamGrid}`}>
          <span className="ad-th">Team</span>
          <span className="ad-th">Event</span>
          <span className="ad-th">Color</span>
          <span className="ad-th" />
        </div>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={`ad-row ${styles.teamGrid}`}>
              {[45, 40, 30, 0].map((w, j) => (
                <div key={j} className="ad-sk" style={{ width: w ? `${w}%` : 0, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ))
        ) : filteredTeams.length === 0 ? (
          <div className={styles.emptyState}>No teams found</div>
        ) : (
          filteredTeams.map((team) => (
            <div key={team.id} className={`ad-row hover ${styles.teamGrid}`}>
              <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                {team.color && <span className={styles.colorDot} style={{ background: team.color }} />}
                {team.name}
              </span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>
                {team.event?.name} ({team.event?.year})
              </span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-3)' }}>{team.color || '—'}</span>
              <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <button type="button" className="ad-ib" onClick={() => openRosterDialog(team)} aria-label={`Manage roster for ${team.name}`}>
                  <AIcon name="teams" size={16} />
                </button>
                <button type="button" className="ad-ib" onClick={() => handleEdit(team)} aria-label={`Edit ${team.name}`}>
                  <AIcon name="edit" size={16} />
                </button>
                <button type="button" className="ad-ib" onClick={() => handleDelete(team)} aria-label={`Delete ${team.name}`}>
                  <AIcon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit team */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <div>
            <div className="ad-crumb">Teams</div>
            <h2 className={styles.dialogTitle}>{editingTeam?.id ? 'Edit team' : 'Add team'}</h2>
          </div>
          <button type="button" className="ad-ib" onClick={() => setDialogOpen(false)} aria-label="Close">
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          <div className={styles.formFields}>
            <FormControl fullWidth required>
              <InputLabel>Event</InputLabel>
              <Select
                value={editingTeam?.event_id || ''}
                label="Event"
                onChange={(e) => setEditingTeam({ ...editingTeam, event_id: e.target.value })}
              >
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Team Name"
              value={editingTeam?.name || ''}
              onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
              required
              fullWidth
              placeholder="e.g., Team Thompson"
            />
            <TextField
              label="Team Color"
              value={editingTeam?.color || ''}
              onChange={(e) => setEditingTeam({ ...editingTeam, color: e.target.value })}
              fullWidth
              placeholder="e.g., Blue, Red, #c1272d"
            />
            <TextField
              label="Logo URL"
              value={editingTeam?.logo_url || ''}
              onChange={(e) => setEditingTeam({ ...editingTeam, logo_url: e.target.value })}
              fullWidth
            />
          </div>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleSave}>
            Save team
          </button>
        </div>
      </Dialog>

      {/* Roster management */}
      <Dialog open={rosterDialogOpen} onClose={() => setRosterDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <div>
            <div className="ad-crumb">Teams</div>
            <h2 className={styles.dialogTitle}>Roster — {selectedTeam?.name}</h2>
            <p className="ad-sub">Tap a player&apos;s badge to toggle captain.</p>
          </div>
          <button type="button" className="ad-ib" onClick={() => setRosterDialogOpen(false)} aria-label="Close">
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          <div className={styles.addRow}>
            <FormControl size="small" style={{ flex: 2 }}>
              <InputLabel>Select Player</InputLabel>
              <Select value={selectedPlayerId} label="Select Player" onChange={(e) => setSelectedPlayerId(e.target.value)}>
                {availablePlayers.map((player) => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.first_name} {player.last_name} (HCP: {player.current_handicap ?? 'N/A'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Handicap at Event"
              type="number"
              inputProps={{ step: 0.1 }}
              value={handicapAtEvent}
              onChange={(e) => setHandicapAtEvent(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" className="pc-d-actionbtn" data-primary="true" disabled={!selectedPlayerId} onClick={addToRoster}>
              Add
            </button>
          </div>

          <p className="ad-th" style={{ marginBottom: 8 }}>
            Current roster ({roster.length})
          </p>

          {roster.length === 0 ? (
            <p style={{ color: 'var(--pc-ink-3)', fontSize: 13 }}>No players on roster.</p>
          ) : (
            <div className="ad-card" style={{ overflow: 'hidden' }}>
              <div className={`ad-row head ${styles.rosterGrid}`}>
                <span className="ad-th">Player</span>
                <span className="ad-th" style={{ textAlign: 'right' }}>Handicap</span>
                <span className="ad-th">Captain</span>
                <span className="ad-th" />
              </div>
              {roster.map((r) => (
                <div key={r.id} className={`ad-row ${styles.rosterGrid}`}>
                  <AdminName firstName={r.player?.first_name} lastName={r.player?.last_name} profileImageUrl={r.player?.profile_image_url} />
                  <span className="ad-num">{r.handicap_at_event ?? r.player?.current_handicap ?? '—'}</span>
                  <span>
                    <button
                      type="button"
                      className="ad-chip"
                      data-on={captainPlayerIds.has(r.player_id)}
                      onClick={() => toggleCaptain(r.player_id)}
                    >
                      {captainPlayerIds.has(r.player_id) ? '★ Captain' : 'Make captain'}
                    </button>
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="ad-ib" onClick={() => removeFromRoster(r)} aria-label="Remove from roster">
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
          <button type="button" className="pc-d-actionbtn" onClick={() => setRosterDialogOpen(false)}>
            Close
          </button>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <h2 className={styles.dialogTitle}>Delete team?</h2>
        </div>
        <DialogContent>
          <p style={{ margin: 0, color: 'var(--pc-ink-2)' }}>
            Are you sure you want to delete {teamToDelete?.name}? This will also remove all roster assignments.
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
