'use client';
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

type InviteRole = 'committee' | 'player' | 'admin';

const PASSWORD_LENGTH = 12;
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generateTempPassword(length = PASSWORD_LENGTH) {
  const values = new Uint32Array(length);
  const hasCrypto = typeof window !== 'undefined' && window.crypto?.getRandomValues;

  if (hasCrypto) {
    window.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i += 1) {
      values[i] = Math.floor(Math.random() * PASSWORD_CHARS.length);
    }
  }

  return Array.from(values, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join('');
}

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
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: { xs: 4, sm: 8 },
        px: { xs: 2, sm: 4 },
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: 520,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
        }}
      >
        <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 700, color: '#2c3e50' }}>
          Invite Player
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
          Create a user account and generate a temporary password. New users must change their password on first login.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
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
              helperText="Minimum 8 characters."
            />
            <Button variant="outlined" onClick={handleGeneratePassword}>
              Generate temporary password
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting || !firstName || !lastName || !email || !tempPassword}
              sx={{ mt: 1 }}
            >
              {submitting ? 'Creating invite...' : 'Send Invite'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
