import { Card as MuiCard, CardContent, CardProps as MuiCardProps } from '@mui/material';
import { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends Omit<MuiCardProps, 'sx'> {
  children: ReactNode;
}

export default function Card({ children, className, ...props }: CardProps) {
  return (
    <MuiCard
      className={`${styles.card} ${className ?? ''}`}
      {...props}
    >
      <CardContent>
        {children}
      </CardContent>
    </MuiCard>
  );
} 