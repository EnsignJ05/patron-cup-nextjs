import { Alert, Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { borderRadius, colors, commonStyles } from '@/styles/theme';

interface FormPageProps {
  title: string;
  subtitle?: string;
  error?: string;
  success?: string;
  maxWidth?: number;
  children: ReactNode;
}

export default function FormPage({
  title,
  subtitle,
  error,
  success,
  maxWidth = 520,
  children,
}: FormPageProps) {
  return (
    <Box sx={commonStyles.pageContainer}>
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth,
          p: { xs: 3, sm: 4 },
          borderRadius: borderRadius.medium,
        }}
      >
        <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 700, color: colors.primary }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ mb: 3, color: colors.secondary }}>
            {subtitle}
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {children}
      </Paper>
    </Box>
  );
}
