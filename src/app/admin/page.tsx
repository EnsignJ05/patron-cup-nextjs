'use client';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { supabase } from '@/lib/supabaseClient';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin12345!';
const LOCALSTORAGE_KEY = 'patroncup_admin_loggedin';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [playerTestData, setPlayerTestData] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(localStorage.getItem(LOCALSTORAGE_KEY) === 'true');
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      setLoading(true);
      setFetchError('');
      supabase
        .from('player_test')
        .select('*')
        .then(({ data, error }) => {
          if (error) {
            setFetchError(error.message);
            setPlayerTestData([]);
          } else {
            setPlayerTestData(data || []);
          }
          setLoading(false);
        });
    }
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      localStorage.setItem(LOCALSTORAGE_KEY, 'true');
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(LOCALSTORAGE_KEY);
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setError('');
    setPlayerTestData([]);
    setFetchError('');
  };

  if (!isLoggedIn) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <Box sx={{ p: 4, borderRadius: 2, boxShadow: 2, background: '#fff', minWidth: 320 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: '#2c3e50' }}>
            Admin Login
          </Typography>
          <form onSubmit={handleLogin}>
            <TextField
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              autoComplete="username"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              autoComplete="current-password"
            />
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Login
            </Button>
          </form>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <Box sx={{ p: 4, borderRadius: 2, boxShadow: 2, background: '#fff', minWidth: 320, maxWidth: 900 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: '#2c3e50' }}>
          Admin Dashboard
        </Typography>
        <Typography sx={{ mb: 3 }}>
          Welcome, admin! (This is a protected route.)
        </Typography>
        <Button variant="outlined" color="secondary" onClick={handleLogout} sx={{ mb: 4 }}>
          Logout
        </Button>
        <Typography variant="h6" sx={{ mb: 2 }}>
          player_test Table
        </Typography>
        {loading && <Typography>Loading...</Typography>}
        {fetchError && <Typography color="error">{fetchError}</Typography>}
        {!loading && !fetchError && playerTestData.length > 0 && (
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {Object.keys(playerTestData[0]).map((key) => (
                    <TableCell key={key}>{key}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {playerTestData.map((row, idx) => (
                  <TableRow key={idx}>
                    {Object.values(row).map((value, i) => (
                      <TableCell key={i}>{String(value)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {!loading && !fetchError && playerTestData.length === 0 && (
          <Typography>No data found in player_test table.</Typography>
        )}
      </Box>
    </Box>
  );
} 