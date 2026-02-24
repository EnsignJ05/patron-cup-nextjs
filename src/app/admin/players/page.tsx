'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import type { Player, PlayerRole } from '@/types/database';

const emptyPlayer: Partial<Player> = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'USA',
  current_handicap: null,
  shirt_size: '',
  dietary_restrictions: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  bio: '',
  role: 'player',
  status: 'active',
};

export default function PlayersAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Partial<Player> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
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

  const handleAdd = () => {
    setEditingPlayer({ ...emptyPlayer });
    setDialogOpen(true);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer({ ...player });
    setDialogOpen(true);
  };

  const handleDelete = (player: Player) => {
    setPlayerToDelete(player);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!playerToDelete) return;
    
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerToDelete.id);

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

    const playerData = {
      first_name: editingPlayer.first_name,
      last_name: editingPlayer.last_name,
      email: editingPlayer.email,
      phone: editingPlayer.phone || null,
      address_line1: editingPlayer.address_line1 || null,
      address_line2: editingPlayer.address_line2 || null,
      city: editingPlayer.city || null,
      state: editingPlayer.state || null,
      zip_code: editingPlayer.zip_code || null,
      country: editingPlayer.country || 'USA',
      current_handicap: editingPlayer.current_handicap,
      shirt_size: editingPlayer.shirt_size || null,
      dietary_restrictions: editingPlayer.dietary_restrictions || null,
      emergency_contact_name: editingPlayer.emergency_contact_name || null,
      emergency_contact_phone: editingPlayer.emergency_contact_phone || null,
      bio: editingPlayer.bio || null,
      role: editingPlayer.role || 'player',
      status: editingPlayer.status || 'active',
    };

    if (editingPlayer.id) {
      // Update
      const { error } = await supabase
        .from('players')
        .update(playerData)
        .eq('id', editingPlayer.id);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Player updated successfully');
    } else {
      // Insert
      const { error } = await supabase
        .from('players')
        .insert([playerData]);

      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Player added successfully');
    }

    setDialogOpen(false);
    setEditingPlayer(null);
    fetchPlayers();
  };

  const filteredPlayers = players.filter(player =>
    `${player.first_name} ${player.last_name} ${player.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: PlayerRole) => {
    switch (role) {
      case 'admin': return 'error';
      case 'committee': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Players Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ bgcolor: '#2c3e50' }}
        >
          Add Player
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <TextField
        fullWidth
        placeholder="Search players..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#2c3e50' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Phone</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Handicap</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Role</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No players found</TableCell>
              </TableRow>
            ) : (
              filteredPlayers.map((player) => (
                <TableRow key={player.id} hover>
                  <TableCell>{player.first_name} {player.last_name}</TableCell>
                  <TableCell>{player.email}</TableCell>
                  <TableCell>{player.phone || '-'}</TableCell>
                  <TableCell>{player.current_handicap ?? '-'}</TableCell>
                  <TableCell>
                    <Chip label={player.role} size="small" color={getRoleColor(player.role)} />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={player.status === 'active' ? 'Active' : player.status === 'pending' ? 'Pending' : 'Inactive'} 
                      size="small" 
                      color={player.status === 'active' ? 'success' : player.status === 'pending' ? 'warning' : 'default'} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEdit(player)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(player)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPlayer?.id ? 'Edit Player' : 'Add Player'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
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
              onChange={(e) => setEditingPlayer({ ...editingPlayer, current_handicap: e.target.value ? parseFloat(e.target.value) : null })}
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
              sx={{ gridColumn: { md: '1 / -1' } }}
            />
            <TextField
              label="Bio"
              value={editingPlayer?.bio || ''}
              onChange={(e) => setEditingPlayer({ ...editingPlayer, bio: e.target.value })}
              fullWidth
              multiline
              rows={3}
              sx={{ gridColumn: { md: '1 / -1' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#2c3e50' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {playerToDelete?.first_name} {playerToDelete?.last_name}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
