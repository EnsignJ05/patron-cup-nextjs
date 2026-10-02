'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Player, PlayerPrivate, PlayerRole } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import AdminName from '@/components/admin/AdminName';
import { AIcon } from '@/components/admin/AdminIcons';
import styles from './page.module.css';

// address/shirt size/dietary/emergency-contact fields live in public.player_private (Task
// S6) -- more sensitive than the rest of Player, which any authenticated member can read.
type EditingPlayer = Partial<Player> & Partial<PlayerPrivate>;

function normalizePrivate(raw: unknown): Partial<PlayerPrivate> {
  const row = Array.isArray(raw) ? raw[0] : raw;
  return row ?? {};
}

const ROLE_BADGE_CLASS: Record<PlayerRole, string> = {
  admin: 'badgeAdmin',
  committee: 'badgeCommittee',
  player: 'badgeDefault',
};

export default function PlayersAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [players, setPlayers] = useState<(Player & { player_private?: Partial<PlayerPrivate> | Partial<PlayerPrivate>[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*, player_private(*)')
      .order('last_name', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setPlayers(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleEdit = (player: Player & { player_private?: Partial<PlayerPrivate> | Partial<PlayerPrivate>[] }) => {
    const { player_private, ...playerFields } = player;
    setEditingPlayer({ ...playerFields, ...normalizePrivate(player_private) });
    setDialogOpen(true);
  };

  const handleDelete = (player: Player) => {
    setPlayerToDelete(player);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!playerToDelete) return;

    const { error } = await supabase.from('players').delete().eq('id', playerToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Player deleted successfully');
      fetchPlayers();
    }
    setDeleteConfirmOpen(false);
    setPlayerToDelete(null);
  };

  const handleSave = async () => {
    if (!editingPlayer) return;
    setError('');

    if (!editingPlayer.id) {
      setError('New players must be invited from the Invite Player page.');
      return;
    }

    const playerData = {
      first_name: editingPlayer.first_name,
      last_name: editingPlayer.last_name,
      email: editingPlayer.email,
      phone: editingPlayer.phone || null,
      city: editingPlayer.city || null,
      state: editingPlayer.state || null,
      country: editingPlayer.country || 'USA',
      current_handicap: editingPlayer.current_handicap,
      bio: editingPlayer.bio || null,
      role: editingPlayer.role || 'player',
      status: editingPlayer.status || 'active',
    };

    // address/shirt size/dietary/emergency-contact live in public.player_private (Task S6) --
    // a separate write, upserted since a row may not exist yet for this player.
    const privateData = {
      player_id: editingPlayer.id,
      address_line1: editingPlayer.address_line1 || null,
      address_line2: editingPlayer.address_line2 || null,
      zip_code: editingPlayer.zip_code || null,
      shirt_size: editingPlayer.shirt_size || null,
      dietary_restrictions: editingPlayer.dietary_restrictions || null,
      emergency_contact_name: editingPlayer.emergency_contact_name || null,
      emergency_contact_phone: editingPlayer.emergency_contact_phone || null,
    };

    const { error: playerError } = await supabase.from('players').update(playerData).eq('id', editingPlayer.id);

    if (playerError) {
      setError(playerError.message);
      return;
    }

    const { error: privateError } = await supabase.from('player_private').upsert(privateData);

    if (privateError) {
      setError(privateError.message);
      return;
    }

    setSuccess('Player updated successfully');

    setDialogOpen(false);
    setEditingPlayer(null);
    fetchPlayers();
  };

  const filteredPlayers = players.filter((player) =>
    `${player.first_name} ${player.last_name} ${player.email}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      <AdminHead
        crumb="Players"
        title="Players"
        sub="Profiles, roles, and status. To add a new player, use the Invite Player page."
        actions={
          <div className="ad-in" style={{ width: 260, justifyContent: 'flex-start', color: 'var(--pc-ink-3)' }}>
            <AIcon name="search" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search players"
              style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'var(--pc-ink)', width: '100%' }}
            />
          </div>
        }
      />

      {error && (
        <Alert severity="error" className={styles.alert} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" className={styles.alert} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <div className="ad-card" style={{ overflow: 'hidden' }}>
        <div className={`ad-row head ${styles.playerGrid}`}>
          <span className="ad-th">Name</span>
          <span className="ad-th">Email</span>
          <span className="ad-th">Phone</span>
          <span className="ad-th" style={{ textAlign: 'right' }}>Handicap</span>
          <span className="ad-th">Role</span>
          <span className="ad-th">Status</span>
          <span className="ad-th" />
        </div>
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={`ad-row ${styles.playerGrid}`}>
              {[50, 55, 35, 20, 30, 30, 0].map((w, j) => (
                <div key={j} className="ad-sk" style={{ width: w ? `${w}%` : 0, marginLeft: j === 3 ? 'auto' : 0, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ))
        ) : filteredPlayers.length === 0 ? (
          <div className={styles.emptyState}>No players found</div>
        ) : (
          filteredPlayers.map((player) => (
            <div key={player.id} className={`ad-row hover ${styles.playerGrid}`}>
              <AdminName firstName={player.first_name} lastName={player.last_name} profileImageUrl={player.profile_image_url} />
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>{player.email}</span>
              <span style={{ fontSize: 13, color: 'var(--pc-ink-2)' }}>{player.phone || '—'}</span>
              <span className="ad-num">{player.current_handicap ?? '—'}</span>
              <span>
                <span className={`ad-badge ${styles[ROLE_BADGE_CLASS[player.role]]}`}>{player.role}</span>
              </span>
              <span>
                <span className={`ad-badge ${player.status === 'active' ? styles.badgeActive : ''}`}>
                  {player.status === 'active' ? 'Active' : player.status === 'pending' ? 'Pending' : 'Inactive'}
                </span>
              </span>
              <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <button
                  type="button"
                  className="ad-ib"
                  onClick={() => handleEdit(player)}
                  aria-label={`Edit ${player.first_name} ${player.last_name}`}
                >
                  <AIcon name="edit" size={16} />
                </button>
                <button
                  type="button"
                  className="ad-ib"
                  onClick={() => handleDelete(player)}
                  aria-label={`Delete ${player.first_name} ${player.last_name}`}
                >
                  <AIcon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <div>
            <div className="ad-crumb">Players</div>
            <h2 className={styles.dialogTitle}>Edit player</h2>
          </div>
          <button type="button" className="ad-ib" onClick={() => setDialogOpen(false)} aria-label="Close">
            <AIcon name="x" size={18} />
          </button>
        </div>
        <DialogContent>
          <div className={styles.formGrid}>
            <TextField
              label="First Name"
              value={editingPlayer?.first_name || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, first_name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Last Name"
              value={editingPlayer?.last_name || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, last_name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={editingPlayer?.email || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Phone"
              value={editingPlayer?.phone || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Address Line 1"
              value={editingPlayer?.address_line1 || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, address_line1: e.target.value })}
              fullWidth
            />
            <TextField
              label="Address Line 2"
              value={editingPlayer?.address_line2 || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, address_line2: e.target.value })}
              fullWidth
            />
            <TextField
              label="City"
              value={editingPlayer?.city || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, city: e.target.value })}
              fullWidth
            />
            <TextField
              label="State"
              value={editingPlayer?.state || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, state: e.target.value })}
              fullWidth
            />
            <TextField
              label="Zip Code"
              value={editingPlayer?.zip_code || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, zip_code: e.target.value })}
              fullWidth
            />
            <TextField
              label="Country"
              value={editingPlayer?.country || 'USA'}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, country: e.target.value })}
              fullWidth
            />
            <TextField
              label="Handicap"
              type="number"
              inputProps={{ step: 0.1 }}
              value={editingPlayer?.current_handicap ?? ''}
              onChange={(e) =>
                setEditingPlayer({ ...editingPlayer, current_handicap: e.target.value ? parseFloat(e.target.value) : null })
              }
              fullWidth
            />
            <TextField
              label="Shirt Size"
              value={editingPlayer?.shirt_size || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, shirt_size: e.target.value })}
              fullWidth
            />
            <TextField
              label="Emergency Contact Name"
              value={editingPlayer?.emergency_contact_name || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, emergency_contact_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Emergency Contact Phone"
              value={editingPlayer?.emergency_contact_phone || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, emergency_contact_phone: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editingPlayer?.role || 'player'}
                label="Role"
                onChange={(e) => setEditingPlayer({ ...editingPlayer, role: e.target.value as PlayerRole })}
              >
                <MenuItem value="player">Player</MenuItem>
                <MenuItem value="committee">Committee</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editingPlayer?.status || 'active'}
                label="Status"
                onChange={(e) => setEditingPlayer({ ...editingPlayer, status: e.target.value as 'active' | 'inactive' | 'pending' })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Dietary Restrictions"
              value={editingPlayer?.dietary_restrictions || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, dietary_restrictions: e.target.value })}
              fullWidth
              multiline
              rows={2}
              className={styles.fieldWide}
            />
            <TextField
              label="Bio"
              value={editingPlayer?.bio || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, bio: e.target.value })}
              fullWidth
              multiline
              rows={3}
              className={styles.fieldWide}
            />
          </div>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
          <button type="button" className="pc-d-actionbtn" data-primary="true" onClick={handleSave}>
            Save player
          </button>
        </div>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ className: 'ad-dlg' }}>
        <div className="ad-dlg-h">
          <h2 className={styles.dialogTitle}>Delete player?</h2>
        </div>
        <DialogContent>
          <p style={{ margin: 0, color: 'var(--pc-ink-2)' }}>
            Are you sure you want to delete {playerToDelete?.first_name} {playerToDelete?.last_name}?
          </p>
        </DialogContent>
        <div className="ad-dlg-f">
          <span style={{ flex: 1 }} />
          <button type="button" className="pc-d-actionbtn" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="pc-d-actionbtn"
            data-primary="true"
            style={{ background: 'var(--pc-team-a)', borderColor: 'var(--pc-team-a)' }}
            onClick={confirmDelete}
          >
            Delete
          </button>
        </div>
      </Dialog>
    </div>
  );
}
