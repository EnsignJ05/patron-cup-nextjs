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
    px: { xs: 1, sm: 2 },
  } as SxProps<Theme>,

  title: {
    mb: { xs: 1, sm: 2 },
    fontWeight: 700,
    fontSize: { xs: '2rem', sm: '2.5rem' },
    color: 'var(--text)',
  } as SxProps<Theme>,

  subtitle: {
    mb: { xs: 2, sm: 4 },
    color: 'var(--text-muted)',
    fontSize: { xs: '1rem', sm: '1.1rem' },
    fontStyle: 'italic',
  } as SxProps<Theme>,

  gridContainer: {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    gap: { xs: 2, sm: 4 },
    width: '100%',
    maxWidth: 900,
    px: 0,
  } as SxProps<Theme>,
}; 