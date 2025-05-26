"use client";
import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Image from 'next/image';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { Analytics } from '@vercel/analytics/react';
import { Inter } from 'next/font/google';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Teams', href: '/teams' },
  { label: 'Itinerary', href: '/itinerary' },
  { label: 'Tee Times', href: '/tee-times' },
  { label: 'Scoreboard', href: '/scoreboard' },
];

function NavigationContent() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
    setDrawerOpen(false);
  };

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        boxShadow: 'none',
        background: '#f5f5f5',
        backdropFilter: 'none',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        minHeight: 72,
      }}
    >
      <Toolbar sx={{ justifyContent: 'center', gap: { xs: 1, md: 4 }, minHeight: 72, px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Logo */}
        <Box 
          component={Link}
          href="/"
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mr: { xs: 1, md: 4 },
            height: 70,
            width: 70,
            position: 'relative',
            '&:hover': {
              opacity: 0.8,
            },
          }}
        >
          <Image
            src="/gallery/patron-logo.png"
            alt="Patron Cup Logo"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </Box>
        {/* Desktop Nav */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
          {navLinks.map((link) => (
            <Button
              key={link.href}
              component={Link}
              href={link.href}
              sx={{
                color: '#2c3e50',
                fontWeight: 600,
                fontSize: 18,
                textTransform: 'none',
                fontFamily: inter.style.fontFamily,
                background: 'none',
                boxShadow: 'none',
                px: 1.5,
                '&:hover': {
                  background: 'rgba(0,0,0,0.03)',
                },
              }}
            >
              {link.label}
            </Button>
          ))}
          {isAuthenticated && (
            <>
              {isAdmin && (
                <Button
                  component={Link}
                  href="/admin/scoreboard"
                  sx={{
                    color: '#2c3e50',
                    fontWeight: 600,
                    fontSize: 18,
                    textTransform: 'none',
                    fontFamily: inter.style.fontFamily,
                    background: 'none',
                    boxShadow: 'none',
                    px: 1.5,
                    '&:hover': {
                      background: 'rgba(0,0,0,0.03)',
                    },
                  }}
                >
                  Admin
                </Button>
              )}
              <Button
                onClick={handleLogout}
                sx={{
                  color: '#e74c3c',
                  fontWeight: 600,
                  fontSize: 18,
                  textTransform: 'none',
                  fontFamily: inter.style.fontFamily,
                  background: 'none',
                  boxShadow: 'none',
                  px: 1.5,
                  '&:hover': {
                    background: 'rgba(231, 76, 60, 0.03)',
                  },
                }}
              >
                Logout
              </Button>
            </>
          )}
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
              {isAuthenticated && (
                <>
                  {isAdmin && (
                    <ListItem disablePadding>
                      <ListItemButton
                        component={Link}
                        href="/admin/scoreboard"
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
                        <ListItemText primary="Admin" />
                      </ListItemButton>
                    </ListItem>
                  )}
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => {
                        handleLogout();
                        setDrawerOpen(false);
                      }}
                      sx={{
                        fontWeight: 600,
                        fontSize: 18,
                        fontFamily: inter.style.fontFamily,
                        color: '#e74c3c',
                        py: 2,
                        '&:hover': {
                          background: 'rgba(231, 76, 60, 0.03)',
                        },
                      }}
                    >
                      <ListItemText primary="Logout" />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
            </List>
          </Drawer>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Patron Cup</title>
        <link rel="icon" type="image/png" sizes="32x32" href="/gallery/patron-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/gallery/patron-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/gallery/patron-logo.png" />
        <meta name="msapplication-TileImage" content="/gallery/patron-logo.png" />
        <meta name="msapplication-TileColor" content="#2c3e50" />
        <meta property="og:title" content="Patron Cup" />
        <meta property="og:description" content="Bandon Dunes Golf Resort - June 4th – 8th" />
        <meta property="og:image" content="/patron-cup-preview.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
      </head>
      <body className={inter.className} style={{ margin: 0, background: '#f5f5f5' }}>
        <AuthProvider>
          <NavigationContent />
          <main>
            {children}
          </main>
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
