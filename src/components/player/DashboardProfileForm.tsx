'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

type ProfileFormProps = {
  playerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  handicap: string;
  profileImageUrl?: string;
  readOnly?: boolean;
};

export default function DashboardProfileForm({ playerId, firstName, lastName, phone, handicap, profileImageUrl = '', readOnly = false }: ProfileFormProps) {
  const router = useRouter();
  const [firstNameValue, setFirstNameValue] = useState(firstName);
  const [lastNameValue, setLastNameValue] = useState(lastName);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [handicapValue, setHandicapValue] = useState(handicap);
  const [profileImage, setProfileImage] = useState(profileImageUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      setError('Image size must be less than 500KB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/player/profile-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to upload image');
      }

      setProfileImage(result.imageUrl);
      
      // Refresh the page to update server component data
      router.refresh();
      setSuccess('Profile picture updated!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return; // Prevent submission in read-only mode
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/player/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstNameValue,
          lastName: lastNameValue,
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
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Avatar
          src={profileImage || undefined}
          alt={`${firstNameValue} ${lastNameValue}`}
          sx={{ width: 80, height: 80, fontSize: '2rem', bgcolor: '#1976d2' }}
          imgProps={{
            onError: (e) => {
              console.error('Avatar image failed to load:', profileImage);
              console.error('Error:', e);
            },
            crossOrigin: 'anonymous'
          }}
        >
          {!profileImage && firstNameValue && lastNameValue && `${firstNameValue[0]}${lastNameValue[0]}`}
        </Avatar>
        {!readOnly && (
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <IconButton
              color="primary"
              aria-label="upload picture"
              component="span"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <CircularProgress size={24} /> : <PhotoCamera />}
            </IconButton>
          </Box>
        )}
      </Box>
      <TextField
        label="First name"
        value={firstNameValue}
        onChange={(event) => setFirstNameValue(event.target.value)}
        disabled={readOnly}
        InputProps={{ readOnly }}
      />
      <TextField
        label="Last name"
        value={lastNameValue}
        onChange={(event) => setLastNameValue(event.target.value)}
        fullWidth
        required
        disabled={readOnly}
        InputProps={{ readOnly }}
      />
      <TextField
        label="Phone"
        value={phoneValue}
        onChange={(event) => setPhoneValue(event.target.value)}
        fullWidth
        disabled={readOnly}
        InputProps={{ readOnly }}
      />
      <TextField
        label="Handicap"
        type="number"
        value={handicapValue}
        onChange={(event) => setHandicapValue(event.target.value)}
        fullWidth
        disabled={readOnly}
        InputProps={{ readOnly }}
      />
      {!readOnly && (
        <Button type="submit" variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save updates'}
        </Button>
      )}
    </Box>
  );
}
