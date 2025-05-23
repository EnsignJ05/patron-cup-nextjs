import { SxProps, Theme } from '@mui/material';

export const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    background: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    py: { xs: 4, sm: 8 },
    px: { xs: 2, sm: 4 },
  } as SxProps<Theme>,

  title: {
    mb: { xs: 4, sm: 6 },
    color: '#2c3e50',
    fontWeight: 700,
    textAlign: 'center',
  } as SxProps<Theme>,

  playerCard: {
    width: '100%',
    maxWidth: 600,
    mb: 4,
    borderRadius: 2,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    bgcolor: '#ffffff',
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
    color: '#2c3e50',
    mb: 1,
  } as SxProps<Theme>,

  playerDetails: {
    display: 'flex',
    gap: 2,
    color: '#666666',
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
    color: '#2c3e50',
    '&.Mui-selected': {
      color: '#e74c3c',
    },
  } as SxProps<Theme>,

  tabIndicator: {
    backgroundColor: '#e74c3c',
  } as SxProps<Theme>,

  mobileSelect: {
    width: '100%',
    mb: 3,
  } as SxProps<Theme>,

  noMatches: {
    textAlign: 'center',
    color: '#666666',
    py: 4,
  } as SxProps<Theme>,

  reroundsContainer: {
    width: '100%',
    maxWidth: 800,
    mt: 4,
  } as SxProps<Theme>,

  reroundsTitle: {
    color: '#2c3e50',
    fontWeight: 600,
    mb: 2,
  } as SxProps<Theme>,

  reroundCard: {
    mb: 2,
    borderRadius: 2,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  } as SxProps<Theme>,

  reroundContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as SxProps<Theme>,

  reroundInfo: {
    display: 'flex',
    flexDirection: 'column',
  } as SxProps<Theme>,

  reroundDate: {
    color: '#2c3e50',
    fontWeight: 500,
  } as SxProps<Theme>,

  reroundTime: {
    color: '#666666',
  } as SxProps<Theme>,

  reroundGroup: {
    color: '#666666',
    fontStyle: 'italic',
  } as SxProps<Theme>,
}; 