import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { Cormorant_Garamond } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';

const cormorantGaramond = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '700'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cormorantGaramond.className} style={{ margin: 0, background: '#f5f5f5' }}>
        <AppBar position="absolute" color="transparent" elevation={0} sx={{ boxShadow: 'none', background: 'transparent' }}>
          <Toolbar sx={{ justifyContent: 'flex-start', mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Logo placeholder - replace with image later */}
              <Typography variant="h6" sx={{ fontWeight: 400, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }} component={Link} href="/" style={{ textDecoration: 'none' }}>
                Patron Cup
              </Typography>
              <Button component={Link} href="/tee-times" sx={{ color: 'white', fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                Tee Times
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
        <main>
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
