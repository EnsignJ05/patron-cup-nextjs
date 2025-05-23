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
    px: { xs: 1, sm: 4 },
  } as SxProps<Theme>,

  title: {
    color: '#2c3e50',
    mb: 4,
    fontSize: { xs: '1.75rem', sm: '2.5rem' },
    textAlign: 'center',
  } as SxProps<Theme>,

  contentContainer: {
    width: '100%',
    maxWidth: 900,
  } as SxProps<Theme>,

  headerContainer: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: { xs: 'stretch', sm: 'center' },
    justifyContent: 'space-between',
    gap: 2,
    mb: 3,
  } as SxProps<Theme>,

  legendContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  } as SxProps<Theme>,

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  } as SxProps<Theme>,

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  } as SxProps<Theme>,

  thompsonDot: {
    bgcolor: '#3498db',
  } as SxProps<Theme>,

  burgessDot: {
    bgcolor: '#e74c3c',
  } as SxProps<Theme>,

  legendText: {
    color: '#666666',
  } as SxProps<Theme>,

  searchField: {
    width: { xs: '100%', sm: 240 },
    '& .MuiOutlinedInput-root': {
      bgcolor: '#ffffff',
      '& fieldset': {
        borderColor: 'rgba(0,0,0,0.12)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(0,0,0,0.24)',
      },
    },
  } as SxProps<Theme>,

  searchIcon: {
    color: '#666666',
  } as SxProps<Theme>,

  helperText: {
    color: '#2c3e50',
    mb: 3,
    textAlign: 'center',
    fontWeight: 700,
    fontStyle: 'italic',
  } as SxProps<Theme>,

  dataGridContainer: {
    height: { xs: 500, sm: 600 },
  } as SxProps<Theme>,

  dataGrid: {
    bgcolor: '#ffffff',
    borderRadius: 2,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    border: 'none',
    '& .MuiDataGrid-columnHeader': {
      bgcolor: 'rgba(0,0,0,0.02)',
      color: '#2c3e50',
      fontWeight: 700,
      fontSize: { xs: '0.875rem', sm: '1rem' },
    },
    '& .MuiDataGrid-row:hover': {
      bgcolor: 'rgba(0,0,0,0.02)',
    },
    '& .MuiDataGrid-cell': {
      padding: { xs: '8px 4px', sm: '8px 16px' },
    },
  } as SxProps<Theme>,

  playerName: {
    color: '#1976d2',
    fontWeight: 600,
    fontSize: { xs: '0.875rem', sm: '1rem' },
    cursor: 'pointer',
    textDecoration: 'underline',
    '&::after': {
      content: '""',
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      marginLeft: 1,
    },
    '&:hover': {
      color: '#1565c0',
      textDecoration: 'underline',
    },
  } as SxProps<Theme>,

  thompsonPlayer: {
    '&::after': {
      bgcolor: '#3498db',
    },
  } as SxProps<Theme>,

  burgessPlayer: {
    '&::after': {
      bgcolor: '#e74c3e',
    },
  } as SxProps<Theme>,

  handicap: {
    width: '100%',
    textAlign: 'center',
    color: '#2c3e50',
    fontSize: { xs: '0.875rem', sm: '1rem' },
  } as SxProps<Theme>,
}; 