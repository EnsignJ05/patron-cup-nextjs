import { SxProps, Theme } from '@mui/material';

export const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    py: { xs: 4, sm: 8 },
    px: { xs: 2, sm: 4 },
  } as SxProps<Theme>,

  title: {
    mb: { xs: 4, sm: 6 },
    color: 'var(--text)',
    fontWeight: 700,
    textAlign: 'center',
  } as SxProps<Theme>,

  playerCard: {
    width: '100%',
    maxWidth: 600,
    mb: 4,
    borderRadius: 2,
    boxShadow: 'var(--shadow-sm)',
    bgcolor: 'var(--surface)',
  } as SxProps<Theme>,

  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    p: 3,
  } as SxProps<Theme>,

  playerName: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: 'var(--text)',
    mb: 1,
  } as SxProps<Theme>,

  playerDetails: {
    display: 'flex',
    gap: 2,
    color: 'var(--text-muted)',
  } as SxProps<Theme>,

  matchesContainer: {
    width: '100%',
    maxWidth: 800,
  } as SxProps<Theme>,

  tabsContainer: {
    width: '100%',
    mb: 3,
  } as SxProps<Theme>,

  tab: {
    color: 'var(--text)',
    '&.Mui-selected': {
      color: 'var(--accent-red)',
    },
  } as SxProps<Theme>,

  tabIndicator: {
    backgroundColor: 'var(--accent-red)',
  } as SxProps<Theme>,

  mobileSelect: {
    width: '100%',
    mb: 3,
  } as SxProps<Theme>,

  noMatches: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    py: 4,
  } as SxProps<Theme>,
}; 