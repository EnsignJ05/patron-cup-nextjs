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

  comingSoonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: 8,
    px: 4,
    bgcolor: '#ffffff',
    borderRadius: 4,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    maxWidth: '600px',
    width: '100%',
  } as SxProps<Theme>,

  comingSoonTitle: {
    color: '#2c3e50',
    fontWeight: 700,
    textAlign: 'center',
    mb: 2,
  } as SxProps<Theme>,

  comingSoonText: {
    color: '#666666',
    textAlign: 'center',
    fontSize: 18,
  } as SxProps<Theme>,

  optionsContainer: {
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    gap: 4,
    maxWidth: '1200px',
    width: '100%',
  } as SxProps<Theme>,

  optionBox: {
    flex: 1,
    width: '100%',
  } as SxProps<Theme>,

  card: {
    height: '100%',
    borderRadius: 4,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
    },
  } as SxProps<Theme>,

  cardMedia: {
    objectFit: 'cover',
  } as SxProps<Theme>,

  cardTitle: {
    mb: 2,
    color: '#2c3e50',
    fontWeight: 700,
  } as SxProps<Theme>,

  cardDescription: {
    mb: 3,
    color: '#666666',
  } as SxProps<Theme>,

  infoRow: {
    display: 'flex',
    alignItems: 'center',
    mb: 1.5,
  } as SxProps<Theme>,

  icon: {
    color: '#2c3e50',
    mr: 1,
  } as SxProps<Theme>,

  infoText: {
    color: '#2c3e50',
  } as SxProps<Theme>,

  link: {
    color: '#2c3e50',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  } as SxProps<Theme>,
}; 