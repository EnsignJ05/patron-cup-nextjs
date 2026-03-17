'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
} from '@mui/material';
import styles from './LoginClient.module.css';

export default function LoginClient() {
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, mustChangePassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    if (!user) return;
    if (mustChangePassword) {
      router.replace('/change-password');
      return;
    }
    const nextPath = searchParams.get('next');
    router.replace(nextPath ?? '/dashboard');
  }, [mustChangePassword, router, searchParams, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box className={styles.pageRoot}>
      <Paper
        elevation={3}
        className={styles.formCard}
      >
        <Typography variant="h4" component="h1" className={styles.title}>
          Login
        </Typography>
        <Typography variant="body2" className={styles.subtitle}>
          Invite-only access. Use the email and temporary password you were given.
        </Typography>

        {error && (
          <Alert severity="error" className={styles.alert}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Box className={styles.formFields}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={submitting}
              className={styles.submitButton}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
