'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useAuth } from '@/context/AuthContext';

export default function PlayerPage() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!isAuthenticated) {
    return null;
  }

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
        Player Dashboard
      </Typography>

      <Box
        sx={{
          width: '100%',
          maxWidth: 800,
          bgcolor: '#ffffff',
          p: { xs: 3, sm: 4 },
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, color: '#2c3e50' }}>
          Welcome, test_user!
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, color: '#666666' }}>
          This is your private player dashboard. Here you can view your personal statistics,
          upcoming matches, and other player-specific information.
        </Typography>

        <Button
          onClick={handleLogout}
          variant="outlined"
          sx={{
            color: '#2c3e50',
            borderColor: '#2c3e50',
            '&:hover': {
              borderColor: '#34495e',
              bgcolor: 'rgba(44, 62, 80, 0.04)',
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
} 