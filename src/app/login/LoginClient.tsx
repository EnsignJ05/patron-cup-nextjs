'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { TextField, Button, Paper, Alert } from '@mui/material';
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
        setSubmitting(false);
      }
      // On success, leave `submitting` true: AuthContext still has to pick up the new
      // session and fetch the role/must-change-password profile before the redirect effect
      // above can fire. Clearing it here would flip the button back to "Sign in" for that
      // gap, making a real few-second wait look like nothing is happening.
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <Paper elevation={0} className={styles.formCard}>
        <h1 className={styles.title}>Login</h1>
        <p className={styles.subtitle}>
          Invite-only access. Use the email and temporary password you were given.
        </p>

        {error && (
          <Alert severity="error" className={styles.alert}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <div className={styles.formFields}>
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
          </div>
        </form>
      </Paper>
    </div>
  );
}
