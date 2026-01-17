'use client';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
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
  const [fetchError, setFetchError] = useState('');
  const [players, setPlayers] = useState<any[]>([]);

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
        .from('branson_roster')
        .select('f_name, l_name, handicap, team')
        .then(({ data, error }) => {
          if (error) {
            setFetchError(error.message);
            setPlayers([]);
          } else {
            setPlayers(data || []);
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
    setFetchError('');
    setPlayers([]);
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

  // Group players by team using joined data
  const thompsonPlayers = players.filter(p => p.team === 1);
  const berasteguiPlayers = players.filter(p => p.team === 2);

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
        px: { xs: 2, sm: 4 },
      }}
    >
      <Typography
        variant="h3"
        sx={{
          color: '#2c3e50',
          mb: 4,
          fontSize: { xs: '1.75rem', sm: '2.5rem' },
          textAlign: 'center',
        }}
      >
        Admin: Teams (from Database)
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: '#2c3e50',
          mb: 4,
          textAlign: 'center',
          fontWeight: 700,
          fontStyle: 'italic',
          maxWidth: 600,
        }}
      >
        This is a live view of teams from the Supabase database.
      </Typography>
      <Button variant="outlined" color="secondary" onClick={handleLogout} sx={{ mb: 4 }}>
        Logout
      </Button>
      {loading && <Typography>Loading...</Typography>}
      {fetchError && <Typography color="error">{fetchError}</Typography>}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 4,
          width: '100%',
          maxWidth: 900,
        }}
      >
        {/* Team Thompson */}
        <Box
          sx={{
            flex: 1,
            bgcolor: '#ffffff',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: '#3498db',
              mb: 3,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontWeight: 700,
            }}
          >
            Team Thompson
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {thompsonPlayers.map((player, idx) => (
              <Typography
                key={idx}
                variant="body1"
                sx={{
                  color: '#1976d2',
                  py: 0.5,
                  cursor: 'default',
                  textDecoration: 'underline',
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {player.f_name} {player.l_name}
                <span style={{ color: '#666666', fontSize: 14, marginLeft: 8 }}>
                  ({player.handicap})
                </span>
              </Typography>
            ))}
          </Box>
        </Box>
        {/* Team Berastegui */}
        <Box
          sx={{
            flex: 1,
            bgcolor: '#ffffff',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: '#e74c3c',
              mb: 3,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontWeight: 700,
            }}
          >
            Team Berastegui
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {berasteguiPlayers.map((player, idx) => (
              <Typography
                key={idx}
                variant="body1"
                sx={{
                  color: '#1976d2',
                  py: 0.5,
                  cursor: 'default',
                  textDecoration: 'underline',
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {player.f_name} {player.l_name}
                <span style={{ color: '#666666', fontSize: 14, marginLeft: 8 }}>
                  ({player.handicap})
                </span>
              </Typography>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 