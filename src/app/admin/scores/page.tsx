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
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { RoundScore, Event, Course, Player } from '@/types/database';

export default function ScoresAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [scores, setScores] = useState<(RoundScore & { event?: Event; course?: Course; player?: Player })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<Partial<RoundScore> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState<RoundScore | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const [scoresRes, eventsRes, coursesRes, playersRes] = await Promise.all([
      supabase
        .from('round_scores')
        .select('*, event:events(*), course:courses(*), player:players(*)')
        .order('round_date', { ascending: false }),
      supabase.from('events').select('*').order('year', { ascending: false }),
      supabase.from('courses').select('*').order('name'),
      supabase.from('players').select('*').eq('is_active', true).order('last_name'),
    ]);

    if (scoresRes.error) setError(scoresRes.error.message);
    else setScores(scoresRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (coursesRes.data) setCourses(coursesRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    const activeEvent = events.find(e => e.is_active) || events[0];
    setEditingScore({ 
      event_id: selectedEventId || activeEvent?.id,
      round_date: new Date().toISOString().split('T')[0],
    });
    setDialogOpen(true);
  };

  const handleEdit = (score: RoundScore) => {
    setEditingScore({ ...score });
    setDialogOpen(true);
  };

  const handleDelete = (score: RoundScore) => {
    setScoreToDelete(score);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!scoreToDelete) return;
    
    const { error } = await supabase
      .from('round_scores')
      .delete()
      .eq('id', scoreToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Score deleted successfully');
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setScoreToDelete(null);
  };

  const handleSave = async () => {
    if (!editingScore) return;
    setError('');

    const scoreData = {
      player_id: editingScore.player_id,
      event_id: editingScore.event_id,
      course_id: editingScore.course_id,
      round_date: editingScore.round_date,
      total_score: editingScore.total_score || null,
      front_nine: editingScore.front_nine || null,
      back_nine: editingScore.back_nine || null,
      handicap_used: editingScore.handicap_used || null,
      net_score: editingScore.net_score || null,
      fairways_hit: editingScore.fairways_hit || null,
      greens_in_regulation: editingScore.greens_in_regulation || null,
      putts: editingScore.putts || null,
      notes: editingScore.notes || null,
    };

    if (editingScore.id) {
      const { error } = await supabase
        .from('round_scores')
        .update(scoreData)
        .eq('id', editingScore.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Score updated successfully');
    } else {
      const { error } = await supabase
        .from('round_scores')
        .insert([scoreData]);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Score added successfully');
    }

    setDialogOpen(false);
    setEditingScore(null);
    fetchData();
  };

  let filteredScores = scores;
  if (selectedEventId) {
    filteredScores = filteredScores.filter(s => s.event_id === selectedEventId);
  }
  if (searchTerm) {
    filteredScores = filteredScores.filter(s => 
      `${s.player?.first_name} ${s.player?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const eventCourses = editingScore?.event_id
    ? courses.filter(c => c.event_id === editingScore.event_id || !c.event_id)
    : courses;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getScoreColor = (score: number | null, par: number) => {
    if (!score) return 'default';
    const diff = score - par;
    if (diff <= -3) return 'success';
    if (diff <= 0) return 'info';
    if (diff <= 5) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Scores Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: '#2c3e50' }}
        >
          Add Score
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
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
        <TextField
          placeholder="Search by player name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#2c3e50' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Player</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Course</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Score</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Front/Back</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Net</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>GIR</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Putts</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredScores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">No scores found</TableCell>
              </TableRow>
            ) : (
              filteredScores.map((score) => (
                <TableRow key={score.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {score.player?.first_name} {score.player?.last_name}
                  </TableCell>
                  <TableCell>{formatDate(score.round_date)}</TableCell>
                  <TableCell>{score.course?.name || '-'}</TableCell>
                  <TableCell>
                    {score.total_score ? (
                      <Chip 
                        label={score.total_score} 
                        size="small" 
                        color={getScoreColor(score.total_score, score.course?.par || 72)}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {score.front_nine || '-'} / {score.back_nine || '-'}
                  </TableCell>
                  <TableCell>{score.net_score ?? '-'}</TableCell>
                  <TableCell>{score.greens_in_regulation ?? '-'}</TableCell>
                  <TableCell>{score.putts ?? '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEdit(score)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(score)} size="small" color="error">
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingScore?.id ? 'Edit Score' : 'Add Score'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Player</InputLabel>
              <Select
                value={editingScore?.player_id || ''}
                label="Player"
                onChange={(e) => setEditingScore({ ...editingScore, player_id: e.target.value })}
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
                value={editingScore?.event_id || ''}
                label="Event"
                onChange={(e) => setEditingScore({ ...editingScore, event_id: e.target.value })}
              >
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Course</InputLabel>
              <Select
                value={editingScore?.course_id || ''}
                label="Course"
                onChange={(e) => setEditingScore({ ...editingScore, course_id: e.target.value })}
              >
                {eventCourses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name} (Par {course.par})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Round Date"
              type="date"
              value={editingScore?.round_date || ''}
              onChange={(e) => setEditingScore({ ...editingScore, round_date: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Total Score"
              type="number"
              value={editingScore?.total_score ?? ''}
              onChange={(e) => setEditingScore({ ...editingScore, total_score: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Handicap Used"
              type="number"
              inputProps={{ step: 0.1 }}
              value={editingScore?.handicap_used ?? ''}
              onChange={(e) => setEditingScore({ ...editingScore, handicap_used: e.target.value ? parseFloat(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Front Nine"
              type="number"
              value={editingScore?.front_nine ?? ''}
              onChange={(e) => setEditingScore({ ...editingScore, front_nine: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Back Nine"
              type="number"
              value={editingScore?.back_nine ?? ''}
              onChange={(e) => setEditingScore({ ...editingScore, back_nine: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Net Score"
              type="number"
              inputProps={{ step: 0.1 }}
              value={editingScore?.net_score ?? ''}
              onChange={(e) => setEditingScore({ ...editingScore, net_score: e.target.value ? parseFloat(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Fairways Hit"
              type="number"
              value={editingScore?.fairways_hit ?? ''}
              onChange={(e) => setEditingScore({ ...editingScore, fairways_hit: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Greens in Regulation"
              type="number"
              value={editingScore?.greens_in_regulation ?? ''}
              onChange={(e) => setEditingScore({ ...editingScore, greens_in_regulation: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Total Putts"
              type="number"
              value={editingScore?.putts ?? ''}
              onChange={(e) => setEditingScore({ ...editingScore, putts: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Notes"
              value={editingScore?.notes || ''}
              onChange={(e) => setEditingScore({ ...editingScore, notes: e.target.value })}
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
          Are you sure you want to delete this score?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
