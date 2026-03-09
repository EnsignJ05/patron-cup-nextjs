import { Alert, Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import styles from './FormPage.module.css';

interface FormPageProps {
  title: string;
  subtitle?: string;
  error?: string;
  success?: string;
  children: ReactNode;
}

export default function FormPage({
  title,
  subtitle,
  error,
  success,
  children,
}: FormPageProps) {
  return (
    <Box className={styles.pageContainer}>
      <Paper
        elevation={2}
        className={styles.formCard}
      >
        <Typography variant="h4" className={styles.title}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" className={styles.subtitle}>
            {subtitle}
          </Typography>
        )}

        {error && (
          <Alert severity="error" className={styles.alert}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" className={styles.alert}>
            {success}
          </Alert>
        )}

        {children}
      </Paper>
    </Box>
  );
}
