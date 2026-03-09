import { SxProps, Theme } from '@mui/material';

export const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    color: 'var(--text)',
    pt: { xs: 4, sm: 8 },
  } as SxProps<Theme>,

  title: {
    mb: { xs: 2, sm: 4 },
    fontWeight: 700,
    color: 'var(--text)',
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
    color: 'var(--accent-blue)',
  } as SxProps<Theme>,

  burgessTeam: {
    color: 'var(--accent-red)',
  } as SxProps<Theme>,

  score: {
    fontWeight: 800,
  } as SxProps<Theme>,

  vs: {
    color: 'var(--text-muted)',
    fontWeight: 300,
  } as SxProps<Theme>,

  tabsContainer: {
    width: '100%',
    maxWidth: 900,
    px: { xs: 2, sm: 3 },
  } as SxProps<Theme>,

  tabs: {
    '& .MuiTab-root': {
      color: 'var(--text-muted)',
      fontWeight: 600,
      fontSize: { xs: '0.9rem', sm: '1rem' },
      textTransform: 'none',
      '&.Mui-selected': {
        color: 'var(--text)',
      },
    },
    '& .MuiTabs-indicator': {
      backgroundColor: 'var(--text)',
    },
  } as SxProps<Theme>,
}; 