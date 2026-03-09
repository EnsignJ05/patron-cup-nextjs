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

  comingSoonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: 8,
    px: 4,
    bgcolor: 'var(--surface)',
    borderRadius: 4,
    boxShadow: 'var(--shadow-md)',
    maxWidth: '600px',
    width: '100%',
  } as SxProps<Theme>,

  comingSoonTitle: {
    color: 'var(--text)',
    fontWeight: 700,
    textAlign: 'center',
    mb: 2,
  } as SxProps<Theme>,

  comingSoonText: {
    color: 'var(--text-muted)',
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
    boxShadow: 'var(--shadow-md)',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: 'var(--shadow-lg)',
    },
  } as SxProps<Theme>,

  cardMedia: {
    objectFit: 'cover',
  } as SxProps<Theme>,

  cardTitle: {
    mb: 2,
    color: 'var(--text)',
    fontWeight: 700,
  } as SxProps<Theme>,

  cardDescription: {
    mb: 3,
    color: 'var(--text-muted)',
  } as SxProps<Theme>,

  infoRow: {
    display: 'flex',
    alignItems: 'center',
    mb: 1.5,
  } as SxProps<Theme>,

  icon: {
    color: 'var(--text)',
    mr: 1,
  } as SxProps<Theme>,

  infoText: {
    color: 'var(--text)',
  } as SxProps<Theme>,

  link: {
    color: 'var(--text)',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  } as SxProps<Theme>,
}; 