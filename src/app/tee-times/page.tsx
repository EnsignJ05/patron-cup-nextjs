'use client';
import { useEffect, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { getAllPlayersAndMatches } from '@/lib/getAllPlayersAndMatches';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { formatPlayerSlug } from '@/utils/playerUtils';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const columns: GridColDef[] = [
  { 
    field: 'name',
    headerName: 'Name',
    width: 160,
    minWidth: 120,
    flex: 1,
    sortable: true,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Link 
          href={`/tee-times/2025/${formatPlayerSlug(params.value)}`}
          style={{ textDecoration: 'none' }}
        >
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#1976d2',
              fontWeight: 600,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              cursor: 'pointer',
              textDecoration: 'underline',
              '&::after': {
                content: '""',
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                marginLeft: 1,
                bgcolor: params.row.team === 'Thompson' ? '#3498db' : '#e74c3e',
              },
              '&:hover': {
                color: '#1565c0',
                textDecoration: 'underline',
              },
            }}
          >
            {params.value}
          </Typography>
        </Link>
      </Box>
    ),
  },
  { 
    field: 'handicap',
    headerName: 'HC',
    width: 70,
    minWidth: 50,
    type: 'number',
    headerAlign: 'center',
    sortable: true,
    renderCell: (params) => (
      <Typography 
        variant="body1" 
        sx={{ 
          width: '100%',
          textAlign: 'center',
          color: '#2c3e50',
          fontSize: { xs: '0.875rem', sm: '1rem' },
        }}
      >
        {params.value}
      </Typography>
    ),
  },
  { 
    field: 'pacificDunes',
    headerName: 'Pacific Dunes',
    width: 140,
    minWidth: 100,
    flex: 1,
    sortable: true,
    renderCell: (params) => (
      <Typography 
        variant="body1" 
        sx={{ 
          color: params.value ? '#2c3e50' : '#95a5a6', 
          fontSize: { xs: '0.875rem', sm: '1rem' },
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {params.value ? params.value : 'No Time'}
      </Typography>
    ),
  },
  { 
    field: 'sheepRanch',
    headerName: 'Sheep Ranch',
    width: 140,
    minWidth: 100,
    flex: 1,
    sortable: true,
    renderCell: (params) => (
      <Typography 
        variant="body1" 
        sx={{ 
          color: params.value ? '#2c3e50' : '#95a5a6', 
          fontSize: { xs: '0.875rem', sm: '1rem' },
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {params.value ? params.value : 'No Time'}
      </Typography>
    ),
  },
  { 
    field: 'bandonDunes',
    headerName: 'Bandon Dunes',
    width: 140,
    minWidth: 100,
    flex: 1,
    sortable: true,
    renderCell: (params) => (
      <Typography 
        variant="body1" 
        sx={{ 
          color: params.value ? '#2c3e50' : '#95a5a6', 
          fontSize: { xs: '0.875rem', sm: '1rem' },
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {params.value ? params.value : 'No Time'}
      </Typography>
    ),
  },
];

export default function TeeTimesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [playerRows, setPlayerRows] = useState<any[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    getAllPlayersAndMatches()
      .then(({ matches, players }) => {
        // Build player rows from matches and players
        const playerMap = new Map();
        matches.forEach(match => {
          // Helper to add or update a player row
          function addPlayerRow(playerId: any, team: 'Thompson' | 'Burgess', course: string, time: string, group: number) {
            if (!playerId) return;
            const player = players.find((p: any) => p.id === playerId);
            if (!player) return;
            const id = player.id;
            const name = `${player.f_name} ${player.l_name}`;
            if (!playerMap.has(id)) {
              playerMap.set(id, {
                id,
                name,
                f_name: player.f_name,
                l_name: player.l_name,
                handicap: player.handicap,
                pacificDunes: '',
                sheepRanch: '',
                bandonDunes: '',
                team,
              });
            }
            const row = playerMap.get(id);
            if (course === 'Pacific Dunes') {
              row.pacificDunes = time;
              row.pacificDunesGroup = group;
            } else if (course === 'Sheep Ranch') {
              row.sheepRanch = time;
              row.sheepRanchGroup = group;
            } else if (course === 'Bandon Dunes') {
              row.bandonDunes = time;
              row.bandonDunesGroup = group;
            }
          }
          addPlayerRow(match.thompson_player1, 'Thompson', match.course, match.time, match.group);
          addPlayerRow(match.thompson_player2, 'Thompson', match.course, match.time, match.group);
          addPlayerRow(match.burgess_player1, 'Burgess', match.course, match.time, match.group);
          addPlayerRow(match.burgess_player2, 'Burgess', match.course, match.time, match.group);
        });
        // Sort by last name, then first name
        const rows = Array.from(playerMap.values()).sort((a: any, b: any) => {
          if (a.l_name === b.l_name) {
            return a.f_name.localeCompare(b.f_name);
          }
          return a.l_name.localeCompare(b.l_name);
        });
        setPlayerRows(rows);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
      });
  }, []);

  const filteredRows = useMemo(() => {
    return playerRows.filter(row => 
      row.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, playerRows]);

  // Define columns for mobile and desktop
  const mobileColumns = columns.slice(0, 2); // Name and Handicap only
  const desktopColumns = columns; // All columns

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: { xs: 4, sm: 8 },
        px: { xs: 1, sm: 4 },
      }}
    >
      <Typography 
        variant="h3" 
        gutterBottom 
        sx={{ 
          color: '#2c3e50', 
          mb: 4,
          fontSize: { xs: '1.75rem', sm: '2.5rem' },
          textAlign: 'center',
        }}
      >
        Tee Times
      </Typography>

      <Box sx={{ width: '100%', maxWidth: 900 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3498db' }} />
              <Typography variant="body2" sx={{ color: '#666666' }}>Team Thompson</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#e74c3c' }} />
              <Typography variant="body2" sx={{ color: '#666666' }}>Team Burgess</Typography>
            </Box>
          </Box>

          <TextField
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              width: { xs: '100%', sm: 240 },
              '& .MuiOutlinedInput-root': {
                bgcolor: '#ffffff',
                '& fieldset': {
                  borderColor: 'rgba(0,0,0,0.12)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(0,0,0,0.24)',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#666666' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Typography 
          variant="body2" 
          sx={{ 
            color: '#2c3e50',
            mb: 3,
            textAlign: 'center',
            fontWeight: 700,
            fontStyle: 'italic',
          }}
        >
          Click on a player&apos;s name to view their match schedule and additional rounds
        </Typography>

        <Box sx={{ height: { xs: 500, sm: 600 } }}>
          <DataGrid
            rows={filteredRows}
            columns={isMobile ? mobileColumns : desktopColumns}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 25 },
              },
              sorting: {
                sortModel: [{ field: 'name', sort: 'asc' }],
              },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              bgcolor: '#ffffff',
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: 'none',
              '& .MuiDataGrid-columnHeader': {
                bgcolor: 'rgba(0,0,0,0.02)',
                color: '#2c3e50',
                fontWeight: 700,
                fontSize: { xs: '0.875rem', sm: '1rem' },
              },
              '& .MuiDataGrid-row:hover': {
                bgcolor: 'rgba(0,0,0,0.02)',
              },
              '& .MuiDataGrid-cell': {
                padding: { xs: '8px 4px', sm: '8px 16px' },
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
} 