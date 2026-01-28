'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';

type ProfileFormProps = {
  preferredName: string;
  phone: string;
  handicap: string;
};

export default function DashboardProfileForm({ preferredName, phone, handicap }: ProfileFormProps) {
  const [nameValue, setNameValue] = useState(preferredName);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [handicapValue, setHandicapValue] = useState(handicap);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/player/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredName: nameValue,
          phone: phoneValue,
          handicap: handicapValue,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update profile.');
      }

      setSuccess('Profile updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update profile.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <TextField
        label="Preferred name"
        value={nameValue}
        onChange={(event) => setNameValue(event.target.value)}
        fullWidth
      />
      <TextField
        label="Phone"
        value={phoneValue}
        onChange={(event) => setPhoneValue(event.target.value)}
        fullWidth
      />
      <TextField
        label="Handicap"
        value={handicapValue}
        onChange={(event) => setHandicapValue(event.target.value)}
        fullWidth
      />
      <Button type="submit" variant="contained" disabled={saving}>
        {saving ? 'Saving...' : 'Save updates'}
      </Button>
    </Box>
  );
}
