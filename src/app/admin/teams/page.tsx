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
import GroupIcon from '@mui/icons-material/Group';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Team, Event, Player, TeamRoster } from '@/types/database';

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
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [handicapAtEvent, setHandicapAtEvent] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const [teamsRes, eventsRes, playersRes] = await Promise.all([
      supabase
        .from('teams')
        .select('*, event:events(*)')
        .order('created_at', { ascending: false }),
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
    
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamToDelete.id);

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
      const { error } = await supabase
        .from('teams')
        .update(teamData)
        .eq('id', editingTeam.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Team updated successfully');
    } else {
      const { error } = await supabase
        .from('teams')
        .insert([teamData]);

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
    
    const { data, error } = await supabase
      .from('team_rosters')
      .select('*, player:players(*)')
      .eq('team_id', team.id);

    if (error) {
      setError(error.message);
    } else {
      setRoster(data || []);
    }
  };

  const addToRoster = async () => {
    if (!selectedTeam || !selectedPlayerId) return;

    const { error } = await supabase
      .from('team_rosters')
      .insert([{
        team_id: selectedTeam.id,
        player_id: selectedPlayerId,
        handicap_at_event: handicapAtEvent ? parseFloat(handicapAtEvent) : null,
      }]);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player added to roster');
      setSelectedPlayerId('');
      setHandicapAtEvent('');
      openRosterDialog(selectedTeam);
    }
  };

  const removeFromRoster = async (rosterId: string) => {
    const { error } = await supabase
      .from('team_rosters')
      .delete()
      .eq('id', rosterId);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player removed from roster');
      if (selectedTeam) openRosterDialog(selectedTeam);
    }
  };

  const filteredTeams = selectedEventId 
    ? teams.filter(t => t.event_id === selectedEventId)
    : teams;

  const availablePlayers = players.filter(
    p => !roster.some(r => r.player_id === p.id)
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Teams Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: '#2c3e50' }}
        >
          Add Team
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
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Team Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Event</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Color</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">No teams found</TableCell>
              </TableRow>
            ) : (
              filteredTeams.map((team) => (
                <TableRow key={team.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{team.name}</TableCell>
                  <TableCell>{team.event?.name} ({team.event?.year})</TableCell>
                  <TableCell>
                    {team.color ? (
                      <Chip 
                        label={team.color} 
                        size="small" 
                        sx={{ bgcolor: team.color.toLowerCase(), color: 'white' }}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openRosterDialog(team)} size="small" color="primary" title="Manage Roster">
                      <GroupIcon />
                    </IconButton>
                    <IconButton onClick={() => handleEdit(team)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(team)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Add Team Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTeam?.id ? 'Edit Team' : 'Add Team'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
              placeholder="e.g., Blue, Red, Green"
            />
            <TextField
              label="Logo URL"
              value={editingTeam?.logo_url || ''}
              onChange={(e) => setEditingTeam({ ...editingTeam, logo_url: e.target.value })}
              fullWidth
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

      {/* Roster Management Dialog */}
      <Dialog open={rosterDialogOpen} onClose={() => setRosterDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Roster - {selectedTeam?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: '#666' }}>
            Add players to this team&apos;s roster
          </Typography>
          
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
                    {player.first_name} {player.last_name} (HCP: {player.current_handicap ?? 'N/A'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Handicap at Event"
              type="number"
              inputProps={{ step: 0.1 }}
              value={handicapAtEvent}
              onChange={(e) => setHandicapAtEvent(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button 
              variant="contained" 
              onClick={addToRoster}
              disabled={!selectedPlayerId}
              sx={{ bgcolor: '#2c3e50' }}
            >
              Add
            </Button>
          </Box>

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Current Roster ({roster.length} players)
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Handicap at Event</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roster.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">No players on roster</TableCell>
                  </TableRow>
                ) : (
                  roster.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.player?.first_name} {r.player?.last_name}</TableCell>
                      <TableCell>{r.handicap_at_event ?? r.player?.current_handicap ?? '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => removeFromRoster(r.id)}
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
          <Button onClick={() => setRosterDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {teamToDelete?.name}? This will also remove all roster assignments.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
