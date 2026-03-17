'use client';
import { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { tempPasswordPolicy } from '@/lib/authConfig';
import { generateTempPassword } from '@/lib/passwordUtils';
import FormPage from '@/components/shared/FormPage';
import styles from './page.module.css';

type InviteRole = 'committee' | 'player' | 'admin';

export default function AdminInvitePage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<InviteRole>('player');
  const [tempPassword, setTempPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGeneratePassword = () => {
    setTempPassword(generateTempPassword());
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          tempPassword,
          role,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error ?? 'Unable to create invite.');
        return;
      }

      setSuccess(`Invite created for ${firstName} ${lastName} (${email}). Temporary password: ${tempPassword}`);
      // Reset form
      setEmail('');
      setFirstName('');
      setLastName('');
      setTempPassword('');
    } catch (err) {
      console.error('Invite error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPage
      title="Invite Player"
      subtitle="Create a user account and generate a temporary password. New users must change their password on first login."
      error={error}
      success={success}
    >
      <form onSubmit={handleSubmit}>
        <Box className={styles.formFields}>
          <Box className={styles.formRow}>
            <TextField
              label="First Name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Last Name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              fullWidth
            />
          </Box>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            select
            label="Role"
            value={role}
            onChange={(event) => setRole(event.target.value as InviteRole)}
            SelectProps={{ native: true }}
            fullWidth
          >
            <option value="player">Player</option>
            <option value="committee">Committee</option>
            <option value="admin">Admin</option>
          </TextField>
          <TextField
            label="Temporary password"
            type="text"
            value={tempPassword}
            onChange={(event) => setTempPassword(event.target.value)}
            required
            fullWidth
            helperText={`Minimum ${tempPasswordPolicy.minLength} characters.`}
          />
          <Button variant="outlined" onClick={handleGeneratePassword}>
            Generate temporary password
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !firstName || !lastName || !email || !tempPassword}
            className={styles.submitButton}
          >
            {submitting ? 'Creating invite...' : 'Send Invite'}
          </Button>
        </Box>
      </form>
    </FormPage>
  );
}
