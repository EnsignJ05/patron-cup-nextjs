'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import {
  confirmMatchResultFromPending,
  proposeMatchResult,
  rejectMatchResultPending,
  withdrawMatchResultPending,
} from '@/lib/matchResultMutations';
import {
  getViewerRoleForPendingProposal,
  isPastScheduledStart,
} from '@/lib/matchResultEntry';
import type { MatchResultsPending } from '@/types/database';
import styles from './PlayerMatchResultActions.module.css';

export type PlayerMatchResultActionsProps = {
  matchId: string;
  matchDate: string;
  matchTime: string | null;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  winnerTeamId: string | null;
  isHalved: boolean;
  resultSetByOfficial: boolean;
  pending: MatchResultsPending | null;
  currentPlayerId: string;
  participantPlayerIds: string[];
  /** When set, called instead of `router.refresh()` after a successful mutation (e.g. Storybook). */
  onSuccessfulMutation?: () => void;
};

type ProposeTarget = { kind: 'team'; teamId: string } | { kind: 'halved' };

export default function PlayerMatchResultActions({
  matchId,
  matchDate,
  matchTime,
  teamA,
  teamB,
  winnerTeamId,
  isHalved,
  resultSetByOfficial,
  pending,
  currentPlayerId,
  participantPlayerIds,
  onSuccessfulMutation,
}: PlayerMatchResultActionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmPropose, setConfirmPropose] = useState<ProposeTarget | null>(null);
  const [confirmFinalize, setConfirmFinalize] = useState<'confirm' | 'reject' | null>(null);

  const afterStart = isPastScheduledStart(matchDate, matchTime);
  const hasRecordedResult = Boolean(winnerTeamId) || isHalved;
  const viewerRole = getViewerRoleForPendingProposal(pending, currentPlayerId, participantPlayerIds);

  const proposedLabel = useMemo(() => {
    if (!pending || pending.status !== 'pending') return '';
    if (pending.is_halved) return 'Halved';
    const id = pending.winner_team_id;
    if (!id) return '';
    if (teamA?.id === id) return teamA.name;
    if (teamB?.id === id) return teamB.name;
    return 'Selected team';
  }, [pending, teamA, teamB]);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>): Promise<boolean> => {
    setError('');
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      setError(result.message || 'Something went wrong.');
      return false;
    }
    if (onSuccessfulMutation) {
      onSuccessfulMutation();
    } else {
      router.refresh();
    }
    return true;
  };

  const handlePropose = async () => {
    if (!confirmPropose) return;
    const isHalvedProposal = confirmPropose.kind === 'halved';
    const winnerId = confirmPropose.kind === 'team' ? confirmPropose.teamId : null;
    const ok = await run(() =>
      proposeMatchResult(supabase, {
        matchId,
        winnerTeamId: winnerId,
        isHalved: isHalvedProposal,
      }),
    );
    if (ok) setConfirmPropose(null);
  };

  const handleConfirmOpponent = async () => {
    if (!pending) return;
    const ok = await run(() => confirmMatchResultFromPending(supabase, { pendingId: pending.id }));
    if (ok) setConfirmFinalize(null);
  };

  const handleReject = async () => {
    if (!pending) return;
    const ok = await run(() => rejectMatchResultPending(supabase, { pendingId: pending.id }));
    if (ok) setConfirmFinalize(null);
  };

  const handleWithdraw = async () => {
    if (!pending) return;
    await run(() => withdrawMatchResultPending(supabase, { pendingId: pending.id }));
  };

  if (resultSetByOfficial) {
    return (
      <Box className={styles.panel}>
        <Typography variant="body2" className={styles.muted}>
          This match result was entered by the committee. Player-submitted results are not used for this
          match.
        </Typography>
      </Box>
    );
  }

  if (hasRecordedResult) {
    return (
      <Box className={styles.panel}>
        <Typography variant="body2" className={styles.muted}>
          Result is recorded on the scoreboard.
        </Typography>
      </Box>
    );
  }

  if (pending && pending.status === 'pending') {
    if (viewerRole === 'proposer') {
      return (
        <Box className={styles.panel}>
          {error ? (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
              {error}
            </Alert>
          ) : null}
          <Typography variant="body2" sx={{ mb: 1.5, color: 'var(--text-muted)' }}>
            Waiting for an opponent to confirm: <strong>{proposedLabel}</strong>
          </Typography>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => void handleWithdraw()}>
            {busy ? <CircularProgress size={18} /> : 'Withdraw proposal'}
          </Button>
        </Box>
      );
    }

    if (viewerRole === 'confirmer') {
      return (
        <Box className={styles.panel}>
          {error ? (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
              {error}
            </Alert>
          ) : null}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Confirm result?
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'var(--text-muted)' }}>
            Proposed outcome: <strong>{proposedLabel}</strong>
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button variant="contained" disabled={busy} onClick={() => setConfirmFinalize('confirm')}>
              Confirm
            </Button>
            <Button color="warning" disabled={busy} onClick={() => setConfirmFinalize('reject')}>
              Reject
            </Button>
          </Box>

          <Dialog open={confirmFinalize !== null} onClose={() => setConfirmFinalize(null)}>
            <DialogTitle>{confirmFinalize === 'confirm' ? 'Confirm result' : 'Reject proposal'}</DialogTitle>
            <DialogContent>
              <Typography>
                {confirmFinalize === 'confirm'
                  ? `Record ${proposedLabel} as the match result?`
                  : 'Reject this proposed result? The proposer can submit again.'}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmFinalize(null)} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() =>
                  void (confirmFinalize === 'confirm' ? handleConfirmOpponent() : handleReject())
                }
              >
                {confirmFinalize === 'confirm' ? 'Confirm' : 'Reject'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    }

    return (
      <Box className={styles.panel}>
        <Typography variant="body2" className={styles.muted}>
          A result is waiting for confirmation from another player.
        </Typography>
      </Box>
    );
  }

  if (!afterStart) {
    return (
      <Box className={styles.panel}>
        <Typography variant="body2" className={styles.muted}>
          You can report a match result after the scheduled tee time.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.panel}>
      {error ? (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Report result
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        <Button
          fullWidth
          size="medium"
          variant="outlined"
          disabled={busy || !teamA}
          onClick={() => teamA && setConfirmPropose({ kind: 'team', teamId: teamA.id })}
        >
          {teamA?.name ?? 'Team A'}
        </Button>
        <Button fullWidth size="medium" variant="outlined" color="info" disabled={busy} onClick={() => setConfirmPropose({ kind: 'halved' })}>
          Halved
        </Button>
        <Button
          fullWidth
          size="medium"
          variant="outlined"
          disabled={busy || !teamB}
          onClick={() => teamB && setConfirmPropose({ kind: 'team', teamId: teamB.id })}
        >
          {teamB?.name ?? 'Team B'}
        </Button>
      </Box>

      <Dialog open={confirmPropose !== null} onClose={() => !busy && setConfirmPropose(null)}>
        <DialogTitle>Submit result</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmPropose?.kind === 'halved'
              ? 'Propose halved? An opponent must confirm before it appears on the scoreboard.'
              : `Propose ${
                  confirmPropose?.kind === 'team'
                    ? teamA?.id === confirmPropose.teamId
                      ? teamA.name
                      : teamB?.name || 'team'
                    : ''
                } to win? An opponent must confirm before it appears on the scoreboard.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPropose(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" disabled={busy} onClick={() => void handlePropose()}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
