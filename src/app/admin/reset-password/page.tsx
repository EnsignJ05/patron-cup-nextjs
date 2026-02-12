'use client';
import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';

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

export default function AdminResetPasswordPage() {
  const [email, setEmail] = useState('');
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
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          tempPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error ?? 'Unable to reset password.');
        return;
      }

      setSuccess(`Password reset for ${email}. Temporary password: ${tempPassword}`);
      setEmail('');
      setTempPassword('');
    } catch (err) {
      console.error('Reset password error:', err);
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
          Reset Password
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
          Set a temporary password and require a password change on next login.
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
              disabled={submitting || !email || !tempPassword}
              sx={{ mt: 1 }}
            >
              {submitting ? 'Resetting password...' : 'Reset Password'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
