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
    color: '#2c3e50',
    mb: 4,
    fontSize: { xs: '1.75rem', sm: '2.5rem' },
    textAlign: 'center',
  } as SxProps<Theme>,

  helperText: {
    color: '#2c3e50',
    mb: 4,
    textAlign: 'center',
    fontWeight: 700,
    fontStyle: 'italic',
    maxWidth: 600,
  } as SxProps<Theme>,

  teamsContainer: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 4,
    width: '100%',
    maxWidth: 900,
  } as SxProps<Theme>,

  teamBox: {
    flex: 1,
    bgcolor: '#ffffff',
    borderRadius: 2,
    p: 3,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  } as SxProps<Theme>,

  teamTitle: {
    mb: 3,
    fontSize: { xs: '1.5rem', sm: '1.75rem' },
    fontWeight: 700,
  } as SxProps<Theme>,

  teamThompsonTitle: {
    color: '#3498db',
  } as SxProps<Theme>,

  teamBurgessTitle: {
    color: '#e74c3c',
  } as SxProps<Theme>,

  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  } as SxProps<Theme>,

  playerLink: {
    color: '#1976d2',
    py: 0.5,
    cursor: 'pointer',
    textDecoration: 'underline',
    '&:hover': {
      color: '#1565c0',
      textDecoration: 'underline',
    },
  } as SxProps<Theme>,

  handicap: {
    color: '#666666',
    fontSize: 14,
  } as SxProps<Theme>,
}; 