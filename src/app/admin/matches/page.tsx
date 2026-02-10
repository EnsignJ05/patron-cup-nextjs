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
import PeopleIcon from '@mui/icons-material/People';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Match, Event, Course, Team, Player, MatchPlayer } from '@/types/database';

export default function MatchesAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [matches, setMatches] = useState<(Match & { event?: Event; course?: Course; team1?: Team; team2?: Team; winner_team?: Team })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  // Match players dialog
  const [playersDialogOpen, setPlayersDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchPlayers, setMatchPlayers] = useState<(MatchPlayer & { player?: Player })[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [handicapUsed, setHandicapUsed] = useState('');

  const fetchData = async () => {
    setLoading(true);
    
    const [matchesRes, eventsRes, coursesRes, teamsRes, playersRes] = await Promise.all([
      supabase
        .from('matches')
        .select('*, event:events(*), course:courses(*), team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner_team:teams!matches_winner_team_id_fkey(*)')
        .order('match_date', { ascending: false }),
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('courses').select('*').order('name'),
      supabase.from('teams').select('*').order('name'),
      supabase.from('players').select('*').eq('is_active', true).order('last_name'),
    ]);

    if (matchesRes.error) setError(matchesRes.error.message);
    else setMatches(matchesRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (coursesRes.data) setCourses(coursesRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    const activeEvent = events.find(e => e.is_active) || events[0];
    setEditingMatch({ 
      event_id: selectedEventId || activeEvent?.id,
      match_number: 1,
      match_date: new Date().toISOString().split('T')[0],
      match_type: 'Two-Man BetterBall',
      is_halved: false,
      points_team1: 0,
      points_team2: 0,
    });
    setDialogOpen(true);
  };

  const handleEdit = (match: Match) => {
    setEditingMatch({ ...match });
    setDialogOpen(true);
  };

  const handleDelete = (match: Match) => {
    setMatchToDelete(match);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!matchToDelete) return;
    
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Match deleted successfully');
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setMatchToDelete(null);
  };

  const handleSave = async () => {
    if (!editingMatch) return;
    setError('');

    const matchData = {
      event_id: editingMatch.event_id,
      match_number: editingMatch.match_number,
      group_number: editingMatch.group_number || null,
      course_id: editingMatch.course_id || null,
      match_date: editingMatch.match_date,
      match_time: editingMatch.match_time || null,
      match_type: editingMatch.match_type,
      team1_id: editingMatch.team1_id || null,
      team2_id: editingMatch.team2_id || null,
      winner_team_id: editingMatch.winner_team_id || null,
      is_halved: editingMatch.is_halved || false,
      points_team1: editingMatch.points_team1 || 0,
      points_team2: editingMatch.points_team2 || 0,
      notes: editingMatch.notes || null,
    };

    if (editingMatch.id) {
      const { error } = await supabase
        .from('matches')
        .update(matchData)
        .eq('id', editingMatch.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Match updated successfully');
    } else {
      const { error } = await supabase
        .from('matches')
        .insert([matchData]);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Match added successfully');
    }

    setDialogOpen(false);
    setEditingMatch(null);
    fetchData();
  };

  // Match players management
  const openPlayersDialog = async (match: Match) => {
    setSelectedMatch(match);
    setPlayersDialogOpen(true);
    
    const { data, error } = await supabase
      .from('match_players')
      .select('*, player:players(*)')
      .eq('match_id', match.id);

    if (error) {
      setError(error.message);
    } else {
      setMatchPlayers(data || []);
    }
  };

  const addMatchPlayer = async () => {
    if (!selectedMatch || !selectedPlayerId || !selectedTeamId) return;

    const { error } = await supabase
      .from('match_players')
      .insert([{
        match_id: selectedMatch.id,
        player_id: selectedPlayerId,
        team_id: selectedTeamId,
        handicap_used: handicapUsed ? parseFloat(handicapUsed) : null,
      }]);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player added to match');
      setSelectedPlayerId('');
      setSelectedTeamId('');
      setHandicapUsed('');
      openPlayersDialog(selectedMatch);
    }
  };

  const removeMatchPlayer = async (mpId: string) => {
    const { error } = await supabase
      .from('match_players')
      .delete()
      .eq('id', mpId);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player removed from match');
      if (selectedMatch) openPlayersDialog(selectedMatch);
    }
  };

  const toggleWinner = async (mpId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('match_players')
      .update({ is_winner: !currentValue })
      .eq('id', mpId);

    if (error) {
      setError(error.message);
    } else {
      if (selectedMatch) openPlayersDialog(selectedMatch);
    }
  };

  const filteredMatches = selectedEventId 
    ? matches.filter(m => m.event_id === selectedEventId)
    : matches;

  const eventTeams = editingMatch?.event_id 
    ? teams.filter(t => t.event_id === editingMatch.event_id)
    : teams;

  const eventCourses = editingMatch?.event_id
    ? courses.filter(c => c.event_id === editingMatch.event_id || !c.event_id)
    : courses;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Matches Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: '#2c3e50' }}
        >
          Add Match
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
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>#</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Course</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Match Type</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Teams</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Result</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredMatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No matches found</TableCell>
              </TableRow>
            ) : (
              filteredMatches.map((match) => (
                <TableRow key={match.id} hover>
                  <TableCell>{match.match_number}</TableCell>
                  <TableCell>{formatDate(match.match_date)}</TableCell>
                  <TableCell>{match.course?.name || '-'}</TableCell>
                  <TableCell>{match.match_type}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip label={match.team1?.name || 'TBD'} size="small" />
                      <span>vs</span>
                      <Chip label={match.team2?.name || 'TBD'} size="small" />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {match.is_halved ? (
                      <Chip label="Halved" size="small" color="info" />
                    ) : match.winner_team ? (
                      <Chip label={match.winner_team.name} size="small" color="success" />
                    ) : (
                      <Chip label="Pending" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => openPlayersDialog(match)} size="small" color="primary" title="Manage Players">
                      <PeopleIcon />
                    </IconButton>
                    <IconButton onClick={() => handleEdit(match)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(match)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Add Match Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMatch?.id ? 'Edit Match' : 'Add Match'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Event</InputLabel>
              <Select
                value={editingMatch?.event_id || ''}
                label="Event"
                onChange={(e) => setEditingMatch({ ...editingMatch, event_id: e.target.value, team1_id: null, team2_id: null })}
              >
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Match Number"
              type="number"
              value={editingMatch?.match_number || ''}
              onChange={(e) => setEditingMatch({ ...editingMatch, match_number: parseInt(e.target.value) })}
              required
              fullWidth
            />
            <TextField
              label="Group Number"
              type="number"
              value={editingMatch?.group_number || ''}
              onChange={(e) => setEditingMatch({ ...editingMatch, group_number: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Course</InputLabel>
              <Select
                value={editingMatch?.course_id || ''}
                label="Course"
                onChange={(e) => setEditingMatch({ ...editingMatch, course_id: e.target.value || null })}
              >
                <MenuItem value="">Select Course</MenuItem>
                {eventCourses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Match Date"
              type="date"
              value={editingMatch?.match_date || ''}
              onChange={(e) => setEditingMatch({ ...editingMatch, match_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Match Time"
              type="time"
              value={editingMatch?.match_time || ''}
              onChange={(e) => setEditingMatch({ ...editingMatch, match_time: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Match Type"
              value={editingMatch?.match_type || ''}
              onChange={(e) => setEditingMatch({ ...editingMatch, match_type: e.target.value })}
              required
              fullWidth
              placeholder="e.g., Two-Man BetterBall, Singles"
            />
            <Box />
            <FormControl fullWidth>
              <InputLabel>Team 1</InputLabel>
              <Select
                value={editingMatch?.team1_id || ''}
                label="Team 1"
                onChange={(e) => setEditingMatch({ ...editingMatch, team1_id: e.target.value || null })}
              >
                <MenuItem value="">Select Team</MenuItem>
                {eventTeams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Team 2</InputLabel>
              <Select
                value={editingMatch?.team2_id || ''}
                label="Team 2"
                onChange={(e) => setEditingMatch({ ...editingMatch, team2_id: e.target.value || null })}
              >
                <MenuItem value="">Select Team</MenuItem>
                {eventTeams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Winner</InputLabel>
              <Select
                value={editingMatch?.winner_team_id || (editingMatch?.is_halved ? 'halved' : '')}
                label="Winner"
                onChange={(e) => {
                  if (e.target.value === 'halved') {
                    setEditingMatch({ ...editingMatch, winner_team_id: null, is_halved: true });
                  } else {
                    setEditingMatch({ ...editingMatch, winner_team_id: e.target.value || null, is_halved: false });
                  }
                }}
              >
                <MenuItem value="">Pending</MenuItem>
                <MenuItem value="halved">Halved (Tie)</MenuItem>
                {eventTeams
                  .filter(t => t.id === editingMatch?.team1_id || t.id === editingMatch?.team2_id)
                  .map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Box />
            <TextField
              label="Points Team 1"
              type="number"
              inputProps={{ step: 0.5 }}
              value={editingMatch?.points_team1 || 0}
              onChange={(e) => setEditingMatch({ ...editingMatch, points_team1: parseFloat(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Points Team 2"
              type="number"
              inputProps={{ step: 0.5 }}
              value={editingMatch?.points_team2 || 0}
              onChange={(e) => setEditingMatch({ ...editingMatch, points_team2: parseFloat(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Notes"
              value={editingMatch?.notes || ''}
              onChange={(e) => setEditingMatch({ ...editingMatch, notes: e.target.value })}
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

      {/* Match Players Dialog */}
      <Dialog open={playersDialogOpen} onClose={() => setPlayersDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Match #{selectedMatch?.match_number} Players
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: '#666' }}>
            Add players to this match
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ flex: 2, minWidth: 200 }}>
              <InputLabel>Select Player</InputLabel>
              <Select
                value={selectedPlayerId}
                label="Select Player"
                onChange={(e) => setSelectedPlayerId(e.target.value)}
              >
                {players.map((player) => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.first_name} {player.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ flex: 1, minWidth: 150 }}>
              <InputLabel>Team</InputLabel>
              <Select
                value={selectedTeamId}
                label="Team"
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                {teams
                  .filter(t => t.id === selectedMatch?.team1_id || t.id === selectedMatch?.team2_id)
                  .map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="Handicap"
              type="number"
              inputProps={{ step: 0.1 }}
              value={handicapUsed}
              onChange={(e) => setHandicapUsed(e.target.value)}
              sx={{ flex: 1, minWidth: 100 }}
            />
            <Button 
              variant="contained" 
              onClick={addMatchPlayer}
              disabled={!selectedPlayerId || !selectedTeamId}
              sx={{ bgcolor: '#2c3e50' }}
            >
              Add
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Handicap</TableCell>
                  <TableCell>Winner</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matchPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No players assigned</TableCell>
                  </TableRow>
                ) : (
                  matchPlayers.map((mp) => (
                    <TableRow key={mp.id}>
                      <TableCell>{mp.player?.first_name} {mp.player?.last_name}</TableCell>
                      <TableCell>
                        {teams.find(t => t.id === mp.team_id)?.name || '-'}
                      </TableCell>
                      <TableCell>{mp.handicap_used ?? '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={mp.is_winner ? 'Winner' : 'No'} 
                          size="small" 
                          color={mp.is_winner ? 'success' : 'default'}
                          onClick={() => toggleWinner(mp.id, mp.is_winner)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => removeMatchPlayer(mp.id)}
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
          <Button onClick={() => setPlayersDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete Match #{matchToDelete?.match_number}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
