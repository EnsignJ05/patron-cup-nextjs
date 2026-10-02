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
import type { Course, Event } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

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

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [coursesRes, eventsRes] = await Promise.all([
      supabase.from('courses').select('*, event:events(*)').order('name'),
      supabase.from('events').select('*').order('year', { ascending: false }),
    ]);

    if (coursesRes.error) setError(coursesRes.error.message);
    else setCourses(coursesRes.data || []);

    if (eventsRes.data) setEvents(eventsRes.data);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    const { error } = await supabase.from('courses').delete().eq('id', courseToDelete.id);

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
      const { error } = await supabase.from('courses').update(courseData).eq('id', editingCourse.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Course updated successfully');
    } else {
      const { error } = await supabase.from('courses').insert([courseData]);

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

  const filteredCourses = selectedEventId ? courses.filter((c) => c.event_id === selectedEventId) : courses;
  const eventCount = new Set(courses.map((c) => c.event_id).filter(Boolean)).size;

  return (
    <div>
      <AdminHead
        crumb="Courses"
        title="Courses"
        sub={`${courses.length} course${courses.length === 1 ? '' : 's'} across ${eventCount} event${eventCount === 1 ? '' : 's'}.`}
        actions={
          <>
            <FormControl size="small" className={styles.eventFilter}>
              <InputLabel>Event</InputLabel>
              <Select
                value={selectedEventId}
                label="Event"
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
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
              <span>Add Course</span>
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
        <div className={`ad-row head ${styles.courseGrid}`}>
          <span className="ad-th">Course name</span>
          <span className="ad-th">Resort</span>
          <span className="ad-th">Event</span>
          <span className="ad-th" style={{ textAlign: 'right' }}>Par</span>
          <span className="ad-th" style={{ textAlign: 'right' }}>Rating / Slope</span>
          <span className="ad-th" style={{ textAlign: 'right' }}>Yards</span>
          <span className="ad-th" />
        </div>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={`ad-row ${styles.courseGrid}`}>
              {[60, 50, 40, 24, 50, 30, 0].map((w, j) => (
                <div
                  key={j}
                  className="ad-sk"
                  style={{ width: w ? `${w}%` : 0, marginLeft: j >= 3 ? 'auto' : 0, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          ))
        ) : filteredCourses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <AIcon name="courses" size={24} />
            </div>
            <div className={styles.emptyTitle}>No courses yet</div>
            <div className={styles.emptyBody}>Add the courses this event will play, then build rounds on them.</div>
            <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleAdd}>
              <AIcon name="plus" size={14} />
              <span>Add Course</span>
            </button>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div key={course.id} className={`ad-row hover ${styles.courseGrid}`}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{course.name}</span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>{course.resort_name || '—'}</span>
              <span>
                {course.event ? (
                  <span className="ad-badge">{course.event.name} ({course.event.year})</span>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--pc-ink-3)' }}>General</span>
                )}
              </span>
              <span className="ad-num">{course.par}</span>
              <span className="ad-num">{course.rating && course.slope ? `${course.rating} / ${course.slope}` : '—'}</span>
              <span className="ad-num">{course.yardage?.toLocaleString() || '—'}</span>
              <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <button type="button" className="ad-ib" onClick={() => handleEdit(course)} aria-label={`Edit ${course.name}`}>
                  <AIcon name="edit" size={16} />
                </button>
                <button type="button" className="ad-ib" onClick={() => handleDelete(course)} aria-label={`Delete ${course.name}`}>
                  <AIcon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit dialog -- real MUI Dialog for the focus-trap/keyboard/ESC behavior,
          restyled to match .ad-dlg's visual language. */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ className: 'ad-dlg' }}
      >
        <div className="ad-dlg-h">
          <div>
            <div className="ad-crumb">Courses</div>
            <h2 className={styles.dialogTitle}>{editingCourse?.id ? 'Edit course' : 'Add course'}</h2>
          </div>
          <button type="button" className="ad-ib" onClick={() => setDialogOpen(false)} aria-label="Close">
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          <div className={styles.formGrid}>
            <TextField
              label="Course Name"
              value={editingCourse?.name || ''}
              onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
              required
              fullWidth
              placeholder="e.g., Pacific Dunes"
              className={styles.fieldWide}
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
              onChange={(e) => setEditingCourse({ ...editingCourse, par: parseInt(e.target.value, 10) })}
              fullWidth
            />
            <TextField
              label="Course Rating"
              type="number"
              inputProps={{ step: 0.1 }}
              value={editingCourse?.rating || ''}
              onChange={(e) =>
                setEditingCourse({ ...editingCourse, rating: e.target.value ? parseFloat(e.target.value) : null })
              }
              fullWidth
            />
            <TextField
              label="Slope"
              type="number"
              value={editingCourse?.slope || ''}
              onChange={(e) =>
                setEditingCourse({ ...editingCourse, slope: e.target.value ? parseInt(e.target.value, 10) : null })
              }
              fullWidth
            />
            <TextField
              label="Yardage"
              type="number"
              value={editingCourse?.yardage || ''}
              onChange={(e) =>
                setEditingCourse({ ...editingCourse, yardage: e.target.value ? parseInt(e.target.value, 10) : null })
              }
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
              className={styles.fieldWide}
            />
          </div>
        </DialogContent>
        <div className="ad-dlg-f">
          {editingCourse?.id && (
            <button
              type="button"
              className="pc-d-actionbtn"
              style={{ color: 'var(--pc-team-a)' }}
              onClick={() => {
                setDialogOpen(false);
                handleDelete(editingCourse as Course);
              }}
            >
              <AIcon name="trash" size={14} />
              <span>Delete</span>
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleSave}>
            Save course
          </button>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <h2 className={styles.dialogTitle}>Delete course?</h2>
        </div>
        <DialogContent>
          <p style={{ margin: 0, color: 'var(--pc-ink-2)' }}>
            Are you sure you want to delete {courseToDelete?.name}? This can&apos;t be undone.
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
