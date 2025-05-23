import { SxProps, Theme } from '@mui/material';

export const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    background: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    color: '#2c3e50',
    pt: { xs: 4, sm: 8 },
  } as SxProps<Theme>,

  title: {
    mb: { xs: 2, sm: 4 },
    fontWeight: 700,
    color: '#2c3e50',
  } as SxProps<Theme>,

  scoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: { xs: 4, sm: 8 },
    mb: { xs: 4, sm: 6 },
    width: '100%',
    maxWidth: 900,
  } as SxProps<Theme>,

  teamScore: {
    textAlign: 'center',
  } as SxProps<Theme>,

  teamName: {
    fontWeight: 700,
    mb: 1,
  } as SxProps<Theme>,

  thompsonTeam: {
    color: '#3498db',
  } as SxProps<Theme>,

  burgessTeam: {
    color: '#e74c3c',
  } as SxProps<Theme>,

  score: {
    fontWeight: 800,
  } as SxProps<Theme>,

  vs: {
    color: '#666666',
    fontWeight: 300,
  } as SxProps<Theme>,

  tabsContainer: {
    width: '100%',
    maxWidth: 900,
    px: { xs: 2, sm: 3 },
  } as SxProps<Theme>,

  tabs: {
    '& .MuiTab-root': {
      color: '#666666',
      fontWeight: 600,
      fontSize: { xs: '0.9rem', sm: '1rem' },
      textTransform: 'none',
      '&.Mui-selected': {
        color: '#2c3e50',
      },
    },
    '& .MuiTabs-indicator': {
      backgroundColor: '#2c3e50',
    },
  } as SxProps<Theme>,
}; 