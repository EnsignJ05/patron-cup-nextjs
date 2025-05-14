import { Card as MuiCard, CardContent, CardProps as MuiCardProps } from '@mui/material';
import { ReactNode } from 'react';
import { commonStyles } from '@/styles/theme';

interface CardProps extends MuiCardProps {
  children: ReactNode;
}

export default function Card({ children, sx, ...props }: CardProps) {
  return (
    <MuiCard
      sx={{
        ...commonStyles.card,
        ...sx
      }}
      {...props}
    >
      <CardContent>
        {children}
      </CardContent>
    </MuiCard>
  );
} 