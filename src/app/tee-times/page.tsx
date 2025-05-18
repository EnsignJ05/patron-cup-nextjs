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
  handicap: number | string;
}

interface PlayerRow {
  id: string;
  name: string;
  handicap: number | string;
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
    width: 160,
    minWidth: 120,
    flex: 1,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#2c3e50',
            fontWeight: 600,
            fontSize: { xs: '0.875rem', sm: '1rem' },
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
    headerName: 'HC',
    width: 70,
    minWidth: 50,
    type: 'number',
    headerAlign: 'center',
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
    headerName: 'Pacific',
    width: 140,
    minWidth: 100,
    flex: 1,
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
        {params.value ? `G${params.row.pacificDunesGroup}: ${params.value}` : 'No Time'}
      </Typography>
    ),
  },
  { 
    field: 'sheepRanch',
    headerName: 'Sheep',
    width: 140,
    minWidth: 100,
    flex: 1,
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
        {params.value ? `G${params.row.sheepRanchGroup}: ${params.value}` : 'No Time'}
      </Typography>
    ),
  },
  { 
    field: 'bandonDunes',
    headerName: 'Bandon',
    width: 140,
    minWidth: 100,
    flex: 1,
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
        {params.value ? `G${params.row.bandonDunesGroup}: ${params.value}` : 'No Time'}
      </Typography>
    ),
  },
];

const rows = getPlayerRows(matchesData.matches);

export default function TeeTimesPage() {
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

      <Box sx={{ height: { xs: 500, sm: 600 }, width: '100%', maxWidth: 900 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
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
  );
} 