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
    px: { xs: 1, sm: 4 },
  } as SxProps<Theme>,

  title: {
    color: 'var(--text)',
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
    bgcolor: 'var(--accent-blue)',
  } as SxProps<Theme>,

  burgessDot: {
    bgcolor: 'var(--accent-red)',
  } as SxProps<Theme>,

  legendText: {
    color: 'var(--text-muted)',
  } as SxProps<Theme>,

  searchField: {
    width: { xs: '100%', sm: 240 },
    '& .MuiOutlinedInput-root': {
      bgcolor: 'var(--surface)',
      '& fieldset': {
        borderColor: 'var(--border)',
      },
      '&:hover fieldset': {
        borderColor: 'var(--border-subtle)',
      },
    },
  } as SxProps<Theme>,

  searchIcon: {
    color: 'var(--text-muted)',
  } as SxProps<Theme>,

  helperText: {
    color: 'var(--text)',
    mb: 3,
    textAlign: 'center',
    fontWeight: 700,
    fontStyle: 'italic',
  } as SxProps<Theme>,

  dataGridContainer: {
    height: { xs: 500, sm: 600 },
  } as SxProps<Theme>,

  dataGrid: {
    bgcolor: 'var(--surface)',
    borderRadius: 2,
    boxShadow: 'var(--shadow-md)',
    border: 'none',
    '& .MuiDataGrid-columnHeader': {
      bgcolor: 'var(--surface-tint)',
      color: 'var(--text)',
      fontWeight: 700,
      fontSize: { xs: '0.875rem', sm: '1rem' },
    },
    '& .MuiDataGrid-row:hover': {
      bgcolor: 'var(--surface-tint)',
    },
    '& .MuiDataGrid-cell': {
      padding: { xs: '8px 4px', sm: '8px 16px' },
    },
  } as SxProps<Theme>,

  playerName: {
    color: 'var(--accent-blue-strong)',
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
      color: 'var(--accent-blue)',
      textDecoration: 'underline',
    },
  } as SxProps<Theme>,

  thompsonPlayer: {
    '&::after': {
      bgcolor: 'var(--accent-blue)',
    },
  } as SxProps<Theme>,

  burgessPlayer: {
    '&::after': {
      bgcolor: 'var(--accent-red)',
    },
  } as SxProps<Theme>,

  handicap: {
    width: '100%',
    textAlign: 'center',
    color: 'var(--text)',
    fontSize: { xs: '0.875rem', sm: '1rem' },
  } as SxProps<Theme>,
}; 