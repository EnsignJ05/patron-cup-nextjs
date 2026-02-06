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
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Course, Event } from '@/types/database';

export default function CoursesAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [courses, setCourses] = useState<(Course & { event?: Event })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    
    const [coursesRes, eventsRes] = await Promise.all([
      supabase
        .from('courses')
        .select('*, event:events(*)')
        .order('name'),
      supabase.from('events').select('*').order('year', { ascending: false }),
    ]);

    if (coursesRes.error) setError(coursesRes.error.message);
    else setCourses(coursesRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setEditingCourse({ 
      event_id: selectedEventId || null, 
      name: '', 
      par: 72,
      resort_name: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse({ ...course });
    setDialogOpen(true);
  };

  const handleDelete = (course: Course) => {
    setCourseToDelete(course);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Course deleted successfully');
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setCourseToDelete(null);
  };

  const handleSave = async () => {
    if (!editingCourse) return;
    setError('');

    const courseData = {
      event_id: editingCourse.event_id || null,
      name: editingCourse.name,
      resort_name: editingCourse.resort_name || null,
      par: editingCourse.par || 72,
      rating: editingCourse.rating || null,
      slope: editingCourse.slope || null,
      yardage: editingCourse.yardage || null,
      description: editingCourse.description || null,
      image_url: editingCourse.image_url || null,
    };

    if (editingCourse.id) {
      const { error } = await supabase
        .from('courses')
        .update(courseData)
        .eq('id', editingCourse.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Course updated successfully');
    } else {
      const { error } = await supabase
        .from('courses')
        .insert([courseData]);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Course added successfully');
    }

    setDialogOpen(false);
    setEditingCourse(null);
    fetchData();
  };

  const filteredCourses = selectedEventId 
    ? courses.filter(c => c.event_id === selectedEventId)
    : courses;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Courses Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: '#2c3e50' }}
        >
          Add Course
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
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Course Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Resort</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Event</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Par</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Rating/Slope</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Yardage</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No courses found</TableCell>
              </TableRow>
            ) : (
              filteredCourses.map((course) => (
                <TableRow key={course.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{course.name}</TableCell>
                  <TableCell>{course.resort_name || '-'}</TableCell>
                  <TableCell>{course.event?.name || 'General'}</TableCell>
                  <TableCell>{course.par}</TableCell>
                  <TableCell>
                    {course.rating && course.slope 
                      ? `${course.rating} / ${course.slope}` 
                      : '-'}
                  </TableCell>
                  <TableCell>{course.yardage?.toLocaleString() || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEdit(course)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(course)} size="small" color="error">
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
          {editingCourse?.id ? 'Edit Course' : 'Add Course'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <TextField
              label="Course Name"
              value={editingCourse?.name || ''}
              onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
              required
              fullWidth
              placeholder="e.g., Pacific Dunes"
            />
            <TextField
              label="Resort Name"
              value={editingCourse?.resort_name || ''}
              onChange={(e) => setEditingCourse({ ...editingCourse, resort_name: e.target.value })}
              fullWidth
              placeholder="e.g., Bandon Dunes Golf Resort"
            />
            <FormControl fullWidth>
              <InputLabel>Event (Optional)</InputLabel>
              <Select
                value={editingCourse?.event_id || ''}
                label="Event (Optional)"
                onChange={(e) => setEditingCourse({ ...editingCourse, event_id: e.target.value || null })}
              >
                <MenuItem value="">No specific event</MenuItem>
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Par"
              type="number"
              value={editingCourse?.par || 72}
              onChange={(e) => setEditingCourse({ ...editingCourse, par: parseInt(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Course Rating"
              type="number"
              inputProps={{ step: 0.1 }}
              value={editingCourse?.rating || ''}
              onChange={(e) => setEditingCourse({ ...editingCourse, rating: e.target.value ? parseFloat(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Slope"
              type="number"
              value={editingCourse?.slope || ''}
              onChange={(e) => setEditingCourse({ ...editingCourse, slope: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Yardage"
              type="number"
              value={editingCourse?.yardage || ''}
              onChange={(e) => setEditingCourse({ ...editingCourse, yardage: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
            />
            <TextField
              label="Image URL"
              value={editingCourse?.image_url || ''}
              onChange={(e) => setEditingCourse({ ...editingCourse, image_url: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={editingCourse?.description || ''}
              onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
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
          Are you sure you want to delete {courseToDelete?.name}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
