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
import styles from './page.module.css';

const columns: GridColDef[] = [
  { 
    field: 'name',
    headerName: 'Name',
    width: 160,
    minWidth: 120,
    flex: 1,
    sortable: true,
    renderCell: (params) => (
      <Box className={styles.nameCell}>
        <Link 
          href={`/tee-times/2025/${formatPlayerSlug(params.value)}`}
          className={styles.nameLink}
        >
          <span className={styles.nameText}>
            {params.value}
            <span
              className={
                params.row.team === 'Thompson'
                  ? styles.teamDotThompson
                  : styles.teamDotBurgess
              }
            />
          </span>
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
      <Typography variant="body1" className={styles.handicapCell}>
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
        className={`${styles.timeCell} ${params.value ? '' : styles.timeCellMuted}`}
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
        className={`${styles.timeCell} ${params.value ? '' : styles.timeCellMuted}`}
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
        className={`${styles.timeCell} ${params.value ? '' : styles.timeCellMuted}`}
      >
        {params.value ? params.value : 'No Time'}
      </Typography>
    ),
  },
];

export default function TeeTimesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [playerRows, setPlayerRows] = useState<any[]>([]);
  // const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  // Always show all columns, even on mobile
  const allColumns = columns;

  return (
    <Box className={styles.pageRoot}>
      <Typography 
        variant="h3" 
        gutterBottom 
        className={styles.pageTitle}
      >
        Tee Times
      </Typography>

      <Box className={styles.contentWrap}>
        <Box className={styles.controlsRow}>
          <Box className={styles.legend}>
            <Box className={styles.legendItem}>
              <Box className={styles.legendDotThompson} />
              <Typography variant="body2" className={styles.legendText}>Team Thompson</Typography>
            </Box>
            <Box className={styles.legendItem}>
              <Box className={styles.legendDotBurgess} />
              <Typography variant="body2" className={styles.legendText}>Team Burgess</Typography>
            </Box>
          </Box>

          <TextField
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            className={styles.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className={styles.searchIcon} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Typography 
          variant="body2" 
          className={styles.hintText}
        >
          Click on a player&apos;s name to view their match schedule and additional rounds
        </Typography>

        <Box className={styles.gridWrap}>
          <DataGrid
            rows={filteredRows}
            columns={allColumns}
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
            className={styles.dataGrid}
          />
        </Box>
      </Box>
    </Box>
  );
} 