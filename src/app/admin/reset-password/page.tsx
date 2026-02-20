'use client';
import { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { tempPasswordPolicy } from '@/lib/authConfig';
import { generateTempPassword } from '@/lib/passwordUtils';
import FormPage from '@/components/shared/FormPage';

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
    <FormPage
      title="Reset Password"
      subtitle="Set a temporary password and require a password change on next login."
      error={error}
      success={success}
    >
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
            helperText={`Minimum ${tempPasswordPolicy.minLength} characters.`}
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
    </FormPage>
  );
}
