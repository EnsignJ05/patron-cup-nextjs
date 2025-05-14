import { Box, Typography } from '@mui/material';
import { commonStyles, typography } from '@/styles/theme';

interface ComingSoonProps {
  message: string;
}

export default function ComingSoon({ message }: ComingSoonProps) {
  return (
    <Box sx={commonStyles.comingSoonCard}>
      <Typography
        variant="h4"
        sx={{
          ...typography.h4,
          textAlign: 'center',
          mb: 2,
        }}
      >
        Coming Soon
      </Typography>
      <Typography
        variant="body1"
        sx={{
          ...typography.body1,
          textAlign: 'center',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
} 