'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import InputAdornment from '@mui/material/InputAdornment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Match, Event, Course } from '@/types/database';

export default function MatchesAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const matchDateInputRef = useRef<HTMLInputElement>(null);
  const [matches, setMatches] = useState<(Match & { event?: Event; course?: Course })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [bulkPlayerCount, setBulkPlayerCount] = useState('');

  const matchTypeOptions = ['Two Man Better Ball', 'Head to Head'];

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const [matchesRes, eventsRes, coursesRes] = await Promise.all([
      supabase
        .from('matches')
        .select('*, event:events(*), course:courses(*)')
        .order('match_date', { ascending: false }),
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('courses').select('*').order('name'),
    ]);

    if (matchesRes.error) setError(matchesRes.error.message);
    else setMatches(matchesRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (coursesRes.data) setCourses(coursesRes.data);
    
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    const activeEvent = events.find(e => e.is_active) || events[0];
    setEditingMatch({ 
      event_id: selectedEventId || activeEvent?.id,
      match_date: new Date().toISOString().split('T')[0],
      match_type: 'Two Man Better Ball',
      is_halved: false,
    });
    setBulkPlayerCount('');
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

    if (!editingMatch.id && !editingMatch.course_id) {
      setError('Please select a course for the new matches.');
      return;
    }

    const matchData = {
      event_id: editingMatch.event_id,
      match_number: editingMatch.match_number || 1,
      group_number: editingMatch.group_number || null,
      course_id: editingMatch.course_id || null,
      match_date: editingMatch.match_date,
      match_time: editingMatch.match_time || null,
      match_type: editingMatch.match_type,
      winner_team_id: editingMatch.winner_team_id || null,
      is_halved: editingMatch.is_halved || false,
      notes: editingMatch.notes || null,
    };

    const getPlayersPerMatch = (matchType: string) => {
      if (matchType === 'Two Man Better Ball') return 4;
      if (matchType === 'Head to Head') return 2;
      return null;
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
      const totalPlayers = parseInt(bulkPlayerCount, 10);
      const playersPerMatch = getPlayersPerMatch(editingMatch.match_type || '');

      if (!totalPlayers || totalPlayers <= 0) {
        setError('Please enter a valid number of players.');
        return;
      }

      if (!playersPerMatch) {
        setError('Please select a valid match type.');
        return;
      }

      if (totalPlayers % playersPerMatch !== 0) {
        setError(`Total players must be divisible by ${playersPerMatch}.`);
        return;
      }

      const matchCount = totalPlayers / playersPerMatch;
      const existingMaxMatchNumber = Math.max(
        0,
        ...matches
          .filter((match) => match.event_id === editingMatch.event_id)
          .map((match) => match.match_number || 0)
      );
      const bulkMatches = Array.from({ length: matchCount }, (_, index) => ({
        ...matchData,
        match_number: existingMaxMatchNumber + index + 1,
        group_number: null,
        match_time: null,
        winner_team_id: null,
        is_halved: false,
      }));

      const { error } = await supabase
        .from('matches')
        .insert(bulkMatches);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess(`${matchCount} matches added successfully`);
    }

    setDialogOpen(false);
    setEditingMatch(null);
    fetchData();
  };

  const filteredMatches = selectedEventId 
    ? matches.filter(m => m.event_id === selectedEventId)
    : matches;

  const eventCourses = editingMatch?.event_id
    ? courses.filter(c => c.event_id === editingMatch.event_id || !c.event_id)
    : courses;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Matches Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            component={Link}
            href="/admin/matches/setup"
            variant="outlined"
            sx={{ borderColor: '#2c3e50', color: '#2c3e50' }}
          >
            Open Match Setup
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ bgcolor: '#2c3e50' }}
          >
            Add Matches
          </Button>
        </Box>
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
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Time</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Course</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Match Type</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredMatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">No matches found</TableCell>
              </TableRow>
            ) : (
              filteredMatches.map((match) => (
                <TableRow key={match.id} hover>
                  <TableCell>{formatDate(match.match_date)}</TableCell>
                  <TableCell>{match.match_time || 'TBD'}</TableCell>
                  <TableCell>{match.course?.name || '-'}</TableCell>
                  <TableCell>{match.match_type}</TableCell>
                  <TableCell align="right">
                    <Button
                      component={Link}
                      href={`/admin/matches/setup?eventId=${match.event_id}`}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Setup
                    </Button>
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
          {editingMatch?.id ? 'Edit Match' : 'Add Matches'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Event</InputLabel>
              <Select
                value={editingMatch?.event_id || ''}
                label="Event"
                onChange={(e) => setEditingMatch({ ...editingMatch, event_id: e.target.value })}
              >
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
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
              inputRef={matchDateInputRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Open date picker"
                      edge="end"
                      onClick={() => {
                        const input = matchDateInputRef.current;
                        if (!input) return;
                        if (typeof (input as HTMLInputElement).showPicker === 'function') {
                          (input as HTMLInputElement).showPicker();
                        } else {
                          input.focus();
                        }
                      }}
                    >
                      <CalendarTodayIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth required>
              <InputLabel>Match Type</InputLabel>
              <Select
                value={editingMatch?.match_type || ''}
                label="Match Type"
                onChange={(e) => setEditingMatch({ ...editingMatch, match_type: e.target.value })}
              >
                {matchTypeOptions.map((matchType) => (
                  <MenuItem key={matchType} value={matchType}>
                    {matchType}
                  </MenuItem>
                ))}
                {editingMatch?.match_type && !matchTypeOptions.includes(editingMatch.match_type) ? (
                  <MenuItem value={editingMatch.match_type}>{editingMatch.match_type}</MenuItem>
                ) : null}
              </Select>
            </FormControl>
            <FormControl fullWidth required={!editingMatch?.id}>
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
            {!editingMatch?.id ? (
              <TextField
                label="Number of Players"
                type="number"
                value={bulkPlayerCount}
                onChange={(e) => setBulkPlayerCount(e.target.value)}
                required
                fullWidth
              />
            ) : null}
            {editingMatch?.id ? (
              <TextField
                label="Match Time"
                type="time"
                value={editingMatch?.match_time || ''}
                onChange={(e) => setEditingMatch({ ...editingMatch, match_time: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            ) : null}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this match?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
