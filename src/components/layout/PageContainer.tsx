import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import styles from './PageContainer.module.css';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function PageContainer({ title, subtitle, children }: PageContainerProps) {
  return (
    <Box className={styles.pageContainer}>
      <Typography
        variant="h3"
        className={`${styles.title} ${subtitle ? styles.titleWithSubtitle : styles.titleNoSubtitle}`}
      >
        {title}
      </Typography>
      
      {subtitle && (
        <Typography 
          variant="subtitle1" 
          className={styles.subtitle}
        >
          {subtitle}
        </Typography>
      )}

      {children}
    </Box>
  );
} 