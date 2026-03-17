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
    color: 'var(--text)',
    mb: 4,
    fontSize: { xs: '1.75rem', sm: '2.5rem' },
    textAlign: 'center',
  } as SxProps<Theme>,

  helperText: {
    color: 'var(--text)',
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
    bgcolor: 'var(--surface)',
    borderRadius: 2,
    p: 3,
    boxShadow: 'var(--shadow-sm)',
  } as SxProps<Theme>,

  teamTitle: {
    mb: 3,
    fontSize: { xs: '1.5rem', sm: '1.75rem' },
    fontWeight: 700,
  } as SxProps<Theme>,

  teamThompsonTitle: {
    color: 'var(--accent-blue)',
  } as SxProps<Theme>,

  teamBurgessTitle: {
    color: 'var(--accent-red)',
  } as SxProps<Theme>,

  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  } as SxProps<Theme>,

  playerLink: {
    color: 'var(--accent-blue-strong)',
    py: 0.5,
    cursor: 'pointer',
    textDecoration: 'underline',
    '&:hover': {
      color: 'var(--accent-blue)',
      textDecoration: 'underline',
    },
  } as SxProps<Theme>,

  handicap: {
    color: 'var(--text-muted)',
    fontSize: 14,
  } as SxProps<Theme>,
}; 