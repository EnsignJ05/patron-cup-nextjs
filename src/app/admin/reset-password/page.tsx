'use client';
import { useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { tempPasswordPolicy } from '@/lib/authConfig';
import { generateTempPassword } from '@/lib/passwordUtils';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import FormPage from '@/components/shared/FormPage';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

type PlayerOption = { id: string; first_name: string; last_name: string; email: string };

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  const labels = ['Too short', 'Weak', 'Okay', 'Strong', 'Very strong'];
  return { score, label: labels[score] ?? 'Very strong' };
}

export default function AdminResetPasswordPage() {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOption | null>(null);
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'generate' | 'type'>('generate');
  const [tempPassword, setTempPassword] = useState(() => generateTempPassword());
  const [customPassword, setCustomPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Admin-authenticated route: reading email here (beyond the public-safe column
      // list) is deliberate, same reasoning as players/[playerId]/page.tsx.
      const { data } = await supabase
        .from('players')
        .select('id, first_name, last_name, email')
        .eq('status', 'active')
        .order('last_name', { ascending: true });
      if (!cancelled && data) setPlayers(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const activePassword = mode === 'generate' ? tempPassword : customPassword;
  const strength = passwordStrength(activePassword);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tempPassword: activePassword }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error ?? 'Unable to reset password.');
        return;
      }

      setSuccess(`Password reset for ${email}. Temporary password: ${activePassword}`);
      setSelectedPlayer(null);
      setEmail('');
      setCustomPassword('');
      setTempPassword(generateTempPassword());
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
      subtitle="Pick a player, then set a new password."
      error={error}
      success={success}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.formFields}>
          <Autocomplete
            options={players}
            value={selectedPlayer}
            onChange={(_event, value) => {
              setSelectedPlayer(value);
              setEmail(value?.email ?? '');
            }}
            getOptionLabel={(p) => `${p.first_name} ${p.last_name}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField {...params} label="Player" placeholder="Search players" fullWidth />
            )}
          />

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            fullWidth
            autoComplete="email"
            helperText="Auto-filled from the selected player, or enter one manually."
          />

          <div>
            <label className="ad-lab">New password</label>
            <div className="ad-seg" style={{ display: 'flex', marginBottom: 10 }}>
              <button
                type="button"
                data-on={mode === 'generate'}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setMode('generate')}
              >
                <AIcon name="rerounds" size={14} />
                Generate
              </button>
              <button
                type="button"
                data-on={mode === 'type'}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setMode('type')}
              >
                <AIcon name="edit" size={14} />
                Type my own
              </button>
            </div>

            {mode === 'generate' ? (
              <div className="ad-card" style={{ padding: '18px 16px', display: 'grid', gap: 14 }}>
                <div className={styles.generatedPassword}>{tempPassword}</div>
                <div className={styles.strengthRow}>
                  <span className={styles.strengthBars}>
                    {[0, 1, 2, 3].map((i) => (
                      <i key={i} className={styles.strengthBar} style={{ opacity: i < strength.score ? 1 : 0.25 }} />
                    ))}
                  </span>
                  {strength.label} · {tempPassword.length} characters
                </div>
                <Button variant="outlined" onClick={() => setTempPassword(generateTempPassword())}>
                  Regenerate
                </Button>
              </div>
            ) : (
              <TextField
                label="Password"
                type="text"
                value={customPassword}
                onChange={(event) => setCustomPassword(event.target.value)}
                required
                fullWidth
                helperText={`${strength.label} · minimum ${tempPasswordPolicy.minLength} characters.`}
              />
            )}
          </div>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={
              submitting || !email || !activePassword || activePassword.length < tempPasswordPolicy.minLength
            }
            className={styles.submitButton}
          >
            {submitting ? 'Resetting password...' : 'Reset Password'}
          </Button>
        </div>
      </form>
    </FormPage>
  );
}
