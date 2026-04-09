'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { AWARD_OPTIONS } from '@/lib/ceremonyAwards';
import type { CeremonyAwardKey } from '@/types/database';

export type NomineeOption = {
  id: string;
  first_name: string;
  last_name: string;
};

type Props = {
  eventId: string;
  eventLabel: string;
  nominatorPlayerId: string;
  nominees: NomineeOption[];
};

export default function AwardNominationsForm({
  eventId,
  eventLabel,
  nominatorPlayerId,
  nominees,
}: Props) {
  const [nominatedPlayerId, setNominatedPlayerId] = useState('');
  const [awardKey, setAwardKey] = useState<CeremonyAwardKey | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sortedNominees = useMemo(
    () =>
      [...nominees].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'en'),
      ),
    [nominees],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = reason.trim();
    if (!nominatedPlayerId || !awardKey || !trimmed) {
      setError('Choose a player, an award, and enter a reason.');
      return;
    }

    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: insertError } = await supabase.from('ceremony_award_nominations').insert({
      event_id: eventId,
      nominator_player_id: nominatorPlayerId,
      nominated_player_id: nominatedPlayerId,
      award_key: awardKey,
      reason: trimmed,
    });
    setSubmitting(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setError('You already submitted this nomination (same player and award).');
      } else {
        setError(insertError.message);
      }
      return;
    }

    setSuccess(true);
    setNominatedPlayerId('');
    setAwardKey('');
    setReason('');
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Event: {eventLabel}
      </Typography>

      <Stack spacing={2.5}>
        <FormControl fullWidth required>
          <InputLabel id="nominee-label">Player to nominate</InputLabel>
          <Select
            labelId="nominee-label"
            id="nominee"
            label="Player to nominate"
            value={nominatedPlayerId}
            onChange={(ev) => setNominatedPlayerId(ev.target.value)}
          >
            <MenuItem value="">
              <em>Select a player</em>
            </MenuItem>
            {sortedNominees.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth required>
          <InputLabel id="award-label">Award</InputLabel>
          <Select
            labelId="award-label"
            id="award"
            label="Award"
            value={awardKey}
            onChange={(ev) => setAwardKey(ev.target.value as CeremonyAwardKey | '')}
          >
            <MenuItem value="">
              <em>Select an award</em>
            </MenuItem>
            {AWARD_OPTIONS.map((opt) => (
              <MenuItem key={opt.key} value={opt.key}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {awardKey ? (
            <FormHelperText>
              {AWARD_OPTIONS.find((o) => o.key === awardKey)?.description}
            </FormHelperText>
          ) : null}
        </FormControl>

        <TextField
          label="Reason"
          placeholder="Why are you nominating them?"
          value={reason}
          onChange={(ev) => setReason(ev.target.value)}
          multiline
          minRows={4}
          fullWidth
          required
          inputProps={{ maxLength: 2000 }}
          helperText={`${reason.length}/2000`}
        />

        {error ? (
          <Typography variant="body2" color="error" role="alert">
            {error}
          </Typography>
        ) : null}
        {success ? (
          <Typography variant="body2" color="success.main" role="status">
            Nomination submitted. Thank you!
          </Typography>
        ) : null}

        <Button type="submit" variant="contained" disabled={submitting} size="large">
          {submitting ? 'Submitting…' : 'Submit nomination'}
        </Button>
      </Stack>
    </Box>
  );
}
