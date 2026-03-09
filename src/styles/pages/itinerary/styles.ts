import { SxProps, Theme } from '@mui/material';

export const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text)',
    pt: { xs: 4, sm: 8 },
  } as SxProps<Theme>,

  title: {
    mb: 2,
    fontWeight: 700,
    color: 'var(--text)',
  } as SxProps<Theme>,

  subtitle: {
    color: 'var(--text-muted)',
  } as SxProps<Theme>,
}; 