"use client";
import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { Analytics } from '@vercel/analytics/react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Itinerary', href: '/itinerary' },
  { label: 'Tee Times', href: '/tee-times' },
  { label: 'Scoreboard', href: '/scoreboard' },
  { label: 'Gallery', href: '/gallery' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0, background: '#f5f5f5' }}>
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{
            boxShadow: 'none',
            background: '#f5f5f5',
            backdropFilter: 'none',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            minHeight: 96,
          }}
        >
          <Toolbar sx={{ justifyContent: 'center', gap: { xs: 2, md: 8 }, minHeight: 96, px: { xs: 1, sm: 2, md: 4 } }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 2, md: 10 } }}>
              <Box sx={{ width: 40, height: 40, bgcolor: '#2c3e50', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                {/* Simple golf icon placeholder */}
                <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="white" strokeWidth="2" /><rect x="9" y="4" width="2" height="8" fill="white" /><circle cx="10" cy="15" r="1.5" fill="white" /></svg>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#2c3e50', fontFamily: inter.style.fontFamily, fontSize: 30, letterSpacing: 1.5 }} component={Link} href="/" style={{ textDecoration: 'none' }}>
                Patron Cup
              </Typography>
            </Box>
            {/* Desktop Nav */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 6 }}>
              {navLinks.map((link) => (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  sx={{
                    color: '#2c3e50',
                    fontWeight: 600,
                    fontSize: 20,
                    textTransform: 'none',
                    fontFamily: inter.style.fontFamily,
                    background: 'none',
                    boxShadow: 'none',
                    px: 2,
                    '&:hover': {
                      background: 'rgba(0,0,0,0.03)',
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
            {/* Mobile Nav */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, ml: 'auto' }}>
              <IconButton
                edge="end"
                color="inherit"
                aria-label="menu"
                onClick={() => setDrawerOpen(true)}
                sx={{ color: '#2c3e50' }}
              >
                <MenuIcon sx={{ fontSize: 32 }} />
              </IconButton>
              <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { bgcolor: '#f5f5f5', color: '#2c3e50', minWidth: 220 } }}
              >
                <List>
                  {navLinks.map((link) => (
                    <ListItem key={link.href} disablePadding>
                      <ListItemButton
                        component={Link}
                        href={link.href}
                        onClick={() => setDrawerOpen(false)}
                        sx={{
                          fontWeight: 600,
                          fontSize: 18,
                          fontFamily: inter.style.fontFamily,
                          color: '#2c3e50',
                          py: 2,
                          '&:hover': {
                            background: 'rgba(0,0,0,0.03)',
                          },
                        }}
                      >
                        <ListItemText primary={link.label} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Drawer>
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
