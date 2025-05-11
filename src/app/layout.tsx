import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0, background: '#101614' }}>
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{
            boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
            background: 'rgba(16,22,20,0.92)',
            backdropFilter: 'blur(8px)',
            borderBottom: '2px solid #22302b',
            minHeight: 96,
          }}
        >
          <Toolbar sx={{ justifyContent: 'center', gap: 8, minHeight: 96, px: 4 }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 10 }}>
              <Box sx={{ width: 40, height: 40, bgcolor: '#3ddad7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                {/* Simple golf icon placeholder */}
                <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="white" strokeWidth="2" /><rect x="9" y="4" width="2" height="8" fill="white" /><circle cx="10" cy="15" r="1.5" fill="white" /></svg>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#3ddad7', fontFamily: inter.style.fontFamily, fontSize: 30, letterSpacing: 1.5 }} component={Link} href="/" style={{ textDecoration: 'none' }}>
                Patron Cup
              </Typography>
            </Box>
            {/* Navigation */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button component={Link} href="/" sx={{ color: 'white', fontWeight: 600, fontSize: 20, textTransform: 'none', fontFamily: inter.style.fontFamily, background: 'none', boxShadow: 'none', px: 2 }}>Home</Button>
              <Button component={Link} href="/itinerary" sx={{ color: 'white', fontWeight: 600, fontSize: 20, textTransform: 'none', fontFamily: inter.style.fontFamily, background: 'none', boxShadow: 'none', px: 2 }}>Itinerary</Button>
              <Button component={Link} href="/tee-times" sx={{ color: 'white', fontWeight: 600, fontSize: 20, textTransform: 'none', fontFamily: inter.style.fontFamily, background: 'none', boxShadow: 'none', px: 2 }}>Tee Times</Button>
              <Button component={Link} href="/scoreboard" sx={{ color: 'white', fontWeight: 600, fontSize: 20, textTransform: 'none', fontFamily: inter.style.fontFamily, background: 'none', boxShadow: 'none', px: 2 }}>Scoreboard</Button>
              <Button component={Link} href="/gallery" sx={{ color: 'white', fontWeight: 600, fontSize: 20, textTransform: 'none', fontFamily: inter.style.fontFamily, background: 'none', boxShadow: 'none', px: 2 }}>Gallery</Button>
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
