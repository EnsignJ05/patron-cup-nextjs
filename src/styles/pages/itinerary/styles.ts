import { SxProps, Theme } from '@mui/material';

export const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    background: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#2c3e50',
    pt: { xs: 4, sm: 8 },
  } as SxProps<Theme>,

  title: {
    mb: 2,
    fontWeight: 700,
    color: '#2c3e50',
  } as SxProps<Theme>,

  subtitle: {
    color: '#666666',
  } as SxProps<Theme>,
}; 