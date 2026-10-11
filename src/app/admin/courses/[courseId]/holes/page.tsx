'use client';
import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { fetchCourseHoles } from '@/lib/repositories/courseHoles';
import type { Course } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

type HoleRow = {
  par: string;
  yardage: string;
  handicap_index: string;
};

const emptyHoles = (): HoleRow[] =>
  Array.from({ length: 18 }, () => ({ par: '', yardage: '', handicap_index: '' }));

export default function CourseHolesAdminPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [course, setCourse] = useState<Course | null>(null);
  const [holes, setHoles] = useState<HoleRow[]>(emptyHoles());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pasteText, setPasteText] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [courseRes, holesRes] = await Promise.all([
      supabase.from('courses').select('id, name, par, rating, slope').eq('id', courseId).single(),
      fetchCourseHoles(supabase, courseId),
    ]);

    if (courseRes.error) setError(courseRes.error.message);
    else setCourse(courseRes.data as Course);

    if (holesRes.error) {
      setError(holesRes.error.message);
    } else if (holesRes.data?.length) {
      const next = emptyHoles();
      holesRes.data.forEach((h) => {
        next[h.hole_number - 1] = {
          par: String(h.par),
          yardage: h.yardage == null ? '' : String(h.yardage),
          handicap_index: h.handicap_index == null ? '' : String(h.handicap_index),
        };
      });
      setHoles(next);
    }
    setLoading(false);
  }, [supabase, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateHole = (idx: number, field: keyof HoleRow, value: string) => {
    setHoles((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const applyPaste = () => {
    const tokens = pasteText
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length < 3) return;

    const next = emptyHoles();
    for (let i = 0; i < 18 && i * 3 + 2 < tokens.length; i++) {
      next[i] = {
        par: tokens[i * 3] ?? '',
        yardage: tokens[i * 3 + 1] ?? '',
        handicap_index: tokens[i * 3 + 2] ?? '',
      };
    }
    setHoles(next);
    setPasteText('');
    setSuccess('');
  };

  const parSum = holes.reduce((sum, h) => sum + (h.par ? parseInt(h.par, 10) || 0 : 0), 0);
  const parsFilled = holes.filter((h) => h.par).length;
  const parMismatch = parsFilled === 18 && course?.par != null && parSum !== course.par;

  const strokeIndexes = holes.map((h) => (h.handicap_index ? parseInt(h.handicap_index, 10) : null));
  const filledIndexes = strokeIndexes.filter((v): v is number => v != null);
  const duplicateIndexes = [...new Set(filledIndexes.filter((v, i) => filledIndexes.indexOf(v) !== i))];
  const missingIndexes =
    filledIndexes.length === 18
      ? Array.from({ length: 18 }, (_, i) => i + 1).filter((v) => !filledIndexes.includes(v))
      : [];

  const frontNineOdd =
    filledIndexes.length === 18
      ? strokeIndexes.slice(0, 9).filter((v) => (v as number) % 2 === 1).length
      : null;
  const unevenSplit = frontNineOdd != null && Math.abs(frontNineOdd - 4.5) > 2.5;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const rows = holes
      .map((h, i) => ({
        course_id: courseId,
        hole_number: i + 1,
        par: h.par ? parseInt(h.par, 10) : null,
        yardage: h.yardage ? parseInt(h.yardage, 10) : null,
        handicap_index: h.handicap_index ? parseInt(h.handicap_index, 10) : null,
      }))
      .filter((r) => r.par != null);

    if (!rows.length) {
      setSaving(false);
      setError('Enter at least a par for one hole before saving.');
      return;
    }

    const { error } = await supabase
      .from('course_holes')
      .upsert(rows, { onConflict: 'course_id,hole_number' });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess('Holes saved.');
    fetchData();
  };

  return (
    <div>
      <AdminHead
        crumb="Courses"
        title={course ? `${course.name} · Holes` : 'Course holes'}
        sub="Par, yardage, and stroke index per hole. Needed for handicap-aware live scoring."
        actions={
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleSave} disabled={saving}>
            <AIcon name="save" size={14} />
            <span>{saving ? 'Saving…' : 'Save holes'}</span>
          </button>
        }
      />

      {error && (
        <Alert severity="error" style={{ marginBottom: 16 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" style={{ marginBottom: 16 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading ? (
        <div style={{ color: 'var(--pc-ink-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
            {parMismatch && (
              <div className={`${styles.banner} ${styles.bannerWarn}`}>
                <AIcon name="handicaps" size={14} />
                <span>
                  Pars sum to {parSum}, but the course par is {course?.par}. Double-check before saving.
                </span>
              </div>
            )}
            {duplicateIndexes.length > 0 && (
              <div className={`${styles.banner} ${styles.bannerWarn}`}>
                <AIcon name="handicaps" size={14} />
                <span>Stroke index used more than once: {duplicateIndexes.join(', ')}.</span>
              </div>
            )}
            {missingIndexes.length > 0 && (
              <div className={`${styles.banner} ${styles.bannerWarn}`}>
                <AIcon name="handicaps" size={14} />
                <span>Stroke index missing: {missingIndexes.join(', ')}.</span>
              </div>
            )}
            {unevenSplit && (
              <div className={`${styles.banner} ${styles.bannerOk}`}>
                <AIcon name="handicaps" size={14} />
                <span>
                  Unusual split: {frontNineOdd} of the front nine's stroke indexes are odd. Conventionally
                  that's close to half. Worth a second look, not necessarily wrong.
                </span>
              </div>
            )}
          </div>

          <div className="ad-card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Paste import</div>
            <div style={{ fontSize: 12, color: 'var(--pc-ink-3)', marginBottom: 10 }}>
              Paste 18 holes as par, yardage, stroke index -- whitespace or comma separated, in hole order
              (e.g. <code>4 412 5, 5 521 3, …</code>). Replaces the grid below.
            </div>
            <textarea
              className={styles.pasteBox}
              rows={3}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="4 372 11&#10;5 521 3&#10;3 158 15&#10;…"
            />
            <div style={{ marginTop: 10 }}>
              <button type="button" className="pc-d-actionbtn" onClick={applyPaste} disabled={!pasteText.trim()}>
                Apply paste
              </button>
            </div>
          </div>

          <div className={styles.holeGrid}>
            <div className={styles.holeHeadCell} />
            <div className={styles.holeHeadCell}>
              <span className="pc-label">Par</span>
            </div>
            <div className={styles.holeHeadCell}>
              <span className="pc-label">Yardage</span>
            </div>
            <div className={styles.holeHeadCell}>
              <span className="pc-label">Stroke index</span>
            </div>
            {holes.map((h, i) => (
              <Fragment key={i}>
                <div className={styles.holeNumCell}>{i + 1}</div>
                <div className={styles.holeCell}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={h.par}
                    onChange={(e) => updateHole(i, 'par', e.target.value)}
                  />
                </div>
                <div className={styles.holeCell}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={h.yardage}
                    onChange={(e) => updateHole(i, 'yardage', e.target.value)}
                  />
                </div>
                <div className={styles.holeCell}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={h.handicap_index}
                    onChange={(e) => updateHole(i, 'handicap_index', e.target.value)}
                  />
                </div>
              </Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
