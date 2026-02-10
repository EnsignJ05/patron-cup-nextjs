import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: '#2c3e50' }}>
        Access denied
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, color: '#2c3e50' }}>
        You do not have permission to view this page.
      </Typography>
      <Button component={Link} href="/" variant="contained">
        Go home
      </Button>
    </Box>
  );
}
