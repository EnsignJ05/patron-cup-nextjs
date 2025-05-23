import { SxProps, Theme } from '@mui/material';

export const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    background: '#f5f5f5',
    color: '#2c3e50',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    textAlign: 'center',
    m: 0,
    p: 0,
    pt: { xs: 4, sm: 6, md: 7 },
    px: { xs: 1, sm: 2, md: 0 },
  } as SxProps<Theme>,

  titleContainer: {
    maxWidth: 700,
    width: '100%',
    px: { xs: 1, sm: 2 },
    mb: { xs: 1.5, sm: 3 },
  } as SxProps<Theme>,

  title: {
    fontWeight: 800,
    fontSize: { xs: '2.1rem', sm: '3rem', md: '4.5rem', lg: '5.5rem' },
    lineHeight: 1.08,
    letterSpacing: '-1.5px',
    mb: { xs: 1, sm: 2 },
    wordBreak: 'break-word',
    color: '#2c3e50',
    textShadow: '0 2px 12px rgba(0,0,0,0.1)',
  } as SxProps<Theme>,

  countdownContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    mb: { xs: 2, sm: 3 },
  } as SxProps<Theme>,

  sliderContainer: {
    width: '100%',
    maxWidth: 900,
    mb: 6,
  } as SxProps<Theme>,

  sliderImage: {
    position: 'relative',
    width: '100%',
    height: { xs: 220, sm: 340, md: 420 },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 5,
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  } as SxProps<Theme>,

  infoContainer: {
    maxWidth: 700,
    width: '100%',
    px: { xs: 1, sm: 2 },
    mb: { xs: 3, sm: 6 },
  } as SxProps<Theme>,

  resortName: {
    fontWeight: 600,
    fontSize: { xs: '1.1rem', sm: '1.7rem', md: '2.5rem', lg: '3rem' },
    color: '#2c3e50',
    mb: { xs: 1, sm: 2 },
    wordBreak: 'break-word',
  } as SxProps<Theme>,

  date: {
    fontWeight: 400,
    fontSize: { xs: '0.95rem', sm: '1.2rem', md: '1.5rem' },
    color: '#666666',
    mb: { xs: 2, sm: 4 },
    wordBreak: 'break-word',
  } as SxProps<Theme>,
}; 