'use client';
import { useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import matchesData from '@/data/matches.json';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

interface Match {
  match: number;
  group: number;
  course: string;
  date: string;
  time: string;
  matchType: string;
  team_thompson: Player[];
  team_burgess: Player[];
  winner: string | null;
}

interface Player {
  name: string;
  handicap: number;
}

interface PlayerRow {
  id: string;
  name: string;
  handicap: number;
  pacificDunes: string;
  pacificDunesGroup?: number;
  sheepRanch: string;
  sheepRanchGroup?: number;
  bandonDunes: string;
  bandonDunesGroup?: number;
  team: 'Thompson' | 'Burgess';
}

function getPlayerRows(matches: Match[]): PlayerRow[] {
  const playerMap = new Map<string, PlayerRow>();

  matches.forEach(match => {
    // Process Team Thompson players
    match.team_thompson.forEach(player => {
      if (!playerMap.has(player.name)) {
        playerMap.set(player.name, {
          id: player.name,
          name: player.name,
          handicap: player.handicap,
          pacificDunes: '',
          sheepRanch: '',
          bandonDunes: '',
          team: 'Thompson'
        });
      }
      const playerRow = playerMap.get(player.name)!;
      if (match.course === 'Pacific Dunes') {
        playerRow.pacificDunes = match.time;
        playerRow.pacificDunesGroup = match.group;
      } else if (match.course === 'Sheep Ranch') {
        playerRow.sheepRanch = match.time;
        playerRow.sheepRanchGroup = match.group;
      } else if (match.course === 'Bandon Dunes') {
        playerRow.bandonDunes = match.time;
        playerRow.bandonDunesGroup = match.group;
      }
    });

    // Process Team Burgess players
    match.team_burgess.forEach(player => {
      if (!playerMap.has(player.name)) {
        playerMap.set(player.name, {
          id: player.name,
          name: player.name,
          handicap: player.handicap,
          pacificDunes: '',
          sheepRanch: '',
          bandonDunes: '',
          team: 'Burgess'
        });
      }
      const playerRow = playerMap.get(player.name)!;
      if (match.course === 'Pacific Dunes') {
        playerRow.pacificDunes = match.time;
        playerRow.pacificDunesGroup = match.group;
      } else if (match.course === 'Sheep Ranch') {
        playerRow.sheepRanch = match.time;
        playerRow.sheepRanchGroup = match.group;
      } else if (match.course === 'Bandon Dunes') {
        playerRow.bandonDunes = match.time;
        playerRow.bandonDunesGroup = match.group;
      }
    });
  });

  return Array.from(playerMap.values());
}

const columns: GridColDef[] = [
  { 
    field: 'name',
    headerName: 'Name',
    width: 200,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#2c3e50',
            fontWeight: 600,
            fontSize: '1rem',
            '&::after': {
              content: '""',
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              marginLeft: 1,
              bgcolor: params.row.team === 'Thompson' ? '#3498db' : '#e74c3c',
            }
          }}
        >
          {params.value}
        </Typography>
      </Box>
    ),
  },
  { 
    field: 'handicap',
    headerName: 'Handicap',
    width: 100,
    type: 'number',
    headerAlign: 'center',
    renderCell: (params) => (
      <Typography 
        variant="body1" 
        sx={{ 
          width: '100%',
          textAlign: 'center',
          color: '#2c3e50',
          fontSize: '1rem',
        }}
      >
        {params.value}
      </Typography>
    ),
  },
  { 
    field: 'pacificDunes',
    headerName: 'Pacific Dunes',
    width: 180,
    renderCell: (params) => (
      <Typography variant="body1" sx={{ color: params.value ? '#2c3e50' : '#95a5a6', fontSize: '1rem' }}>
        {params.value ? `Group ${params.row.pacificDunesGroup} : ${params.value}` : 'No Tee Time'}
      </Typography>
    ),
  },
  { 
    field: 'sheepRanch',
    headerName: 'Sheep Ranch',
    width: 180,
    renderCell: (params) => (
      <Typography variant="body1" sx={{ color: params.value ? '#2c3e50' : '#95a5a6', fontSize: '1rem' }}>
        {params.value ? `Group ${params.row.sheepRanchGroup} : ${params.value}` : 'No Tee Time'}
      </Typography>
    ),
  },
  { 
    field: 'bandonDunes',
    headerName: 'Bandon Dunes',
    width: 180,
    renderCell: (params) => (
      <Typography variant="body1" sx={{ color: params.value ? '#2c3e50' : '#95a5a6', fontSize: '1rem' }}>
        {params.value ? `Group ${params.row.bandonDunesGroup} : ${params.value}` : 'No Tee Time'}
      </Typography>
    ),
  },
];

export default function TeeTimesPage() {
  const showTeeTimes = process.env.NEXT_PUBLIC_SHOW_TEE_TIMES === 'true';
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return getPlayerRows(matchesData.matches as Match[]);
  }, []);

  const filteredRows = useMemo(() => {
    if (search.length < 3) return rows;
    return rows.filter(row => 
      row.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 8,
        px: { xs: 2, sm: 4 },
      }}
    >
      <Typography variant="h3" gutterBottom sx={{ color: '#2c3e50', mb: 4 }}>
        Tee Times
      </Typography>

      {!showTeeTimes ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 4,
            bgcolor: '#ffffff',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <Typography variant="h4" sx={{ color: '#2c3e50', fontWeight: 700, textAlign: 'center', mb: 2 }}>
            Coming Soon
          </Typography>
          <Typography variant="body1" sx={{ color: '#666666', textAlign: 'center', fontSize: 18 }}>
            Let&apos;s be honest, you will probably be too hungover to remember your tee time.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ width: '100%', maxWidth: 1200 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3498db' }} />
                <Typography variant="body2" sx={{ color: '#666666' }}>Team Thompson</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#e74c3c' }} />
                <Typography variant="body2" sx={{ color: '#666666' }}>Team Burgess</Typography>
              </Box>
            </Box>
            <input
              type="text"
              placeholder="Search for Player"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '220px',
                maxWidth: '100%',
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: 15,
              }}
            />
          </Box>

          <Box 
            sx={{
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
              overflow: 'hidden',
            }}
          >
            <DataGrid
              autoHeight
              rows={filteredRows}
              columns={columns}
              disableColumnMenu
              disableRowSelectionOnClick
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#f5f5f5',
                  fontWeight: 700,
                  color: '#2c3e50',
                  fontSize: '1.1rem',
                },
                '& .MuiDataGrid-row': {
                  fontWeight: 500,
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.02)',
                  },
                },
                '& .MuiDataGrid-cell': {
                  color: '#2c3e50',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  fontSize: '1rem',
                },
              }}
            />
          </Box>

          {search.length >= 3 && filteredRows.length === 0 && (
            <Typography variant="body1" sx={{ color: '#c0392b', mt: 2, textAlign: 'center' }}>
              No players found for &quot;{search}&quot;
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
} 