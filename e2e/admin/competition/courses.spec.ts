import { test, expect } from '../../fixtures/test-data.fixtures';
import { getE2ESupabaseAdminClient } from '../../support/supabaseAdminE2E';

/**
 * Phase 4: remaining admin CRUD coverage. admin/courses has no special validation gaps (no
 * client-side guard to test, unlike events/lodging's date checks) -- this covers the standard
 * create/edit/delete cycle plus the course-delete cascade to course_holes, which hasn't been
 * exercised yet (events.spec.ts's cascade test covers an event delete, which cascades courses
 * too, but not a direct course-level delete).
 */

test('creates, edits, and deletes a course, cascading its holes on delete', async ({
  page,
  runSlug,
  registerCleanup,
}) => {
  const supabase = getE2ESupabaseAdminClient();
  const { data: activeEvent } = await supabase.from('events').select('id, name, year').eq('is_active', true).single();
  if (!activeEvent) throw new Error('Could not resolve the seeded active event');

  const courseName = `${runSlug} Dunes`;

  registerCleanup(async () => {
    await supabase.from('courses').delete().ilike('name', `${runSlug}%`);
  });

  await page.goto('/admin/courses');
  await page.getByRole('button', { name: 'Add Course' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Course Name').fill(courseName);
  await dialog.getByLabel('Resort Name').fill(`${runSlug} Resort`);
  await dialog.locator('.MuiFormControl-root', { hasText: 'Event' }).getByRole('combobox').click();
  await page.getByRole('option', { name: `${activeEvent.name} (${activeEvent.year})`, exact: true }).click();
  await dialog.getByLabel('Par').fill('71');
  await dialog.getByLabel('Yardage').fill('6900');
  await dialog.getByRole('button', { name: 'Save course' }).click();

  await expect(page.getByText('Course added successfully')).toBeVisible();

  const { data: createdCourse } = await supabase.from('courses').select('id, par, yardage, event_id').eq('name', courseName).single();
  expect(createdCourse?.par).toBe(71);
  expect(createdCourse?.yardage).toBe(6900);
  expect(createdCourse?.event_id).toBe(activeEvent.id);

  // Give this course a hole, to prove the delete cascade below actually removes something,
  // not just the course row itself.
  const { error: holeError } = await supabase.from('course_holes').insert({
    course_id: createdCourse!.id,
    hole_number: 1,
    par: 4,
  });
  if (holeError) throw new Error(`Failed to create throwaway course_holes row: ${holeError.message}`);

  // Edit cycle.
  const courseRow = page.locator('.ad-row', { hasText: courseName });
  await courseRow.getByRole('button', { name: `Edit ${courseName}` }).click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel('Par').fill('72');
  await editDialog.getByRole('button', { name: 'Save course' }).click();
  await expect(page.getByText('Course updated successfully')).toBeVisible();

  const { data: editedCourse } = await supabase.from('courses').select('par').eq('id', createdCourse!.id).single();
  expect(editedCourse?.par).toBe(72);

  // Delete cycle, via the dedicated delete button (not the dialog's own Delete action).
  const updatedRow = page.locator('.ad-row', { hasText: courseName });
  await updatedRow.getByRole('button', { name: `Delete ${courseName}` }).click();
  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog.getByText(`Are you sure you want to delete ${courseName}?`)).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();

  await expect(confirmDialog).not.toBeVisible();
  await expect(page.getByText(courseName)).not.toBeVisible();

  const { data: courseAfter } = await supabase.from('courses').select('id').eq('id', createdCourse!.id).maybeSingle();
  const { data: holeAfter } = await supabase.from('course_holes').select('id').eq('course_id', createdCourse!.id).maybeSingle();
  expect(courseAfter).toBeNull();
  expect(holeAfter).toBeNull();
});
