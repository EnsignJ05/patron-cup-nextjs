import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { commonStyles, typography } from '@/styles/theme';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function PageContainer({ title, subtitle, children }: PageContainerProps) {
  return (
    <Box sx={commonStyles.pageContainer}>
      <Typography variant="h3" sx={{ ...typography.h3, mb: subtitle ? { xs: 1, sm: 2 } : { xs: 2, sm: 4 } }}>
        {title}
      </Typography>
      
      {subtitle && (
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mb: { xs: 2, sm: 4 }, 
            color: 'secondary.main',
            fontSize: { xs: '1rem', sm: '1.1rem' },
            fontStyle: 'italic'
          }}
        >
          {subtitle}
        </Typography>
      )}

      {children}
    </Box>
  );
} 