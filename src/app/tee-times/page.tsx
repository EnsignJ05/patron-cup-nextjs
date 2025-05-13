'use client';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMemo, useState, useEffect } from 'react';
import teeTimesDataRaw from '@/data/tee-times.json';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface PlayerRow {
  id: string;
  name: string;
  handicap: number;
  bandonDunes: string;
  pacificDunes: string;
  oldMacdonald: string;
}

// Helper to aggregate all players and their tee times
function getPlayerRows(): PlayerRow[] {
  const teeTimesData: Record<string, Array<{ group: string; team_bolton: { name: string; handicap: number }[]; team_ensign: { name: string; handicap: number }[] }>> = teeTimesDataRaw as Record<string, Array<{ group: string; team_bolton: { name: string; handicap: number }[]; team_ensign: { name: string; handicap: number }[] }>>;
  const playerMap: Record<string, PlayerRow & Record<'bandonDunes' | 'pacificDunes' | 'oldMacdonald', string>> = {};
  const courseKeys = ['bandonDunes', 'pacificDunes', 'oldMacdonald'] as const;

  for (const courseKey of courseKeys) {
    const teeTimes = teeTimesData[courseKey];
    if (!teeTimes) continue;
    for (const group of teeTimes) {
      const groupTime = group.group;
      for (const player of [...group.team_bolton, ...group.team_ensign]) {
        if (!playerMap[player.name]) {
          playerMap[player.name] = {
            id: player.name,
            name: player.name,
            handicap: player.handicap,
            bandonDunes: '',
            pacificDunes: '',
            oldMacdonald: '',
          };
        }
        const key = courseKey;
        if (playerMap[player.name][key]) {
          playerMap[player.name][key] += `, ${groupTime}`;
        } else {
          playerMap[player.name][key] = groupTime;
        }
      }
    }
  }
  return Object.values(playerMap);
}

const columns: GridColDef[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
  { field: 'handicap', headerName: 'Handicap', type: 'number', minWidth: 100 },
  { field: 'bandonDunes', headerName: 'Bandon Dunes', flex: 1, minWidth: 160 },
  { field: 'pacificDunes', headerName: 'Pacific Dunes', flex: 1, minWidth: 160 },
  { field: 'oldMacdonald', headerName: 'Old Mac', flex: 1, minWidth: 160 },
];

export default function TeeTimesPage() {
  const showTeeTimes = process.env.NEXT_PUBLIC_SHOW_TEE_TIMES === 'true';
  const [search, setSearch] = useState('');
  const [filteredRows, setFilteredRows] = useState<PlayerRow[]>([]);
  const [showNoResults, setShowNoResults] = useState(false);
  const rows = useMemo(() => getPlayerRows(), []);

  useEffect(() => {
    if (search.length >= 3) {
      const filtered = rows.filter((row) =>
        row.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredRows(filtered);
      setShowNoResults(filtered.length === 0);
    } else {
      setFilteredRows(rows);
      setShowNoResults(false);
    }
  }, [search, rows]);

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
          <Typography
            variant="h4"
            sx={{
              color: '#2c3e50',
              fontWeight: 700,
              textAlign: 'center',
              mb: 2,
            }}
          >
            Coming Soon
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#666666',
              textAlign: 'center',
              fontSize: 18,
            }}
          >
            Let&apos;s be honest, you will probably be too hungover to remember your tee time.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ width: '100%', maxWidth: 900, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
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
          <DataGrid
            autoHeight
            rows={filteredRows}
            columns={columns}
            pageSizeOptions={[10, 20, 50]}
            pagination
            disableColumnMenu
            sx={{
              background: '#fff',
              borderRadius: 2,
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f5f5f5', fontWeight: 700, color: '#2c3e50' },
              '& .MuiDataGrid-row': { fontWeight: 500 },
              '& .MuiDataGrid-cell': { color: '#2c3e50' },
              mb: 2,
            }}
          />
          {showNoResults && (
            <Typography variant="body1" sx={{ color: '#c0392b', mt: 2, textAlign: 'center' }}>
              No results found.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
} 