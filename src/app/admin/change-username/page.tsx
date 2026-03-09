'use client';
import { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import FormPage from '@/components/shared/FormPage';
import styles from './page.module.css';

export default function AdminChangeUsernamePage() {
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/change-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentEmail,
          newEmail,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error ?? 'Unable to update the email.');
        return;
      }

      setSuccess(`Updated login email from ${currentEmail} to ${newEmail}.`);
      setCurrentEmail('');
      setNewEmail('');
    } catch (err) {
      console.error('Change username error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPage
      title="Change Username"
      subtitle="Update a user's login email while keeping the same account."
      error={error}
      success={success}
    >
      <form onSubmit={handleSubmit}>
        <Box className={styles.formFields}>
          <TextField
            label="Current email"
            type="email"
            value={currentEmail}
            onChange={(event) => setCurrentEmail(event.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="New email"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !currentEmail || !newEmail}
            className={styles.submitButton}
          >
            {submitting ? 'Updating email...' : 'Update Email'}
          </Button>
        </Box>
      </form>
    </FormPage>
  );
}
