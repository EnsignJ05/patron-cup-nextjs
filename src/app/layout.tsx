"use client";
import React, { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import Image from 'next/image';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import { Analytics } from '@vercel/analytics/react';
import { Inter } from 'next/font/google';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { canAccessDashboard, isAdminRole } from '@/lib/authConfig';
import { useRouter } from 'next/navigation';
import './globals.css';
import styles from './layout.module.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });
const THEME_STORAGE_KEY = 'theme-preference';
type ThemePreference = 'light' | 'dark';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Teams', href: '/teams' },
  { label: 'Matches', href: '/matches' },
  { label: 'Itinerary', href: '/itinerary' },
  // { label: 'Tee Times', href: '/tee-times' },
  // { label: 'Scoreboard', href: '/scoreboard' },
  { label: 'FAQ', href: '/faq' },
];

export function NavigationContent() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const isAuthenticated = Boolean(user);
  const isAdmin = isAdminRole(role);
  const hasDashboardAccess = canAccessDashboard(role);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
    setDrawerOpen(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      setThemePreference(saved);
    } else {
      setThemePreference(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (typeof window.matchMedia !== 'function') {
      const fallbackTheme = themePreference === 'dark' ? 'dark' : 'light';
      setResolvedTheme(fallbackTheme);
      document.documentElement.setAttribute('data-theme', fallbackTheme);
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const resolveTheme = (preference: ThemePreference | null) =>
      preference ?? (media.matches ? 'dark' : 'light');
    const applyTheme = (preference: ThemePreference | null) => {
      const nextTheme = resolveTheme(preference);
      setResolvedTheme(nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    };

    applyTheme(themePreference);

    const handleChange = (event: MediaQueryListEvent) => {
      if (!themePreference) {
        const nextTheme = event.matches ? 'dark' : 'light';
        setResolvedTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [themePreference]);

  const handleThemeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPreference: ThemePreference = event.target.checked ? 'dark' : 'light';
    setThemePreference(nextPreference);
    localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
  };

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      className={styles.appBar}
    >
      <Toolbar className={styles.toolbar}>
        {/* Logo */}
        <Box 
          component={Link}
          href="/"
          className={styles.logoLink}
        >
          <Image
            src="/gallery/patron-logo.png"
            alt="Patron Cup Logo"
            fill
            className={styles.logoImage}
            priority
          />
        </Box>
        {/* Desktop Nav */}
        <Box className={styles.desktopNav}>
          {navLinks.map((link) => (
            <Button
              key={link.href}
              component={Link}
              href={link.href}
              className={styles.navButton}
            >
              {link.label}
            </Button>
          ))}
          {isAuthenticated && hasDashboardAccess && (
            <>
              <Button
                component={Link}
                href="/dashboard"
                className={styles.navButton}
              >
                Dashboard
              </Button>
              <Button
                component={Link}
                href="/players"
                className={styles.navButton}
              >
                Players
              </Button>
            </>
          )}
          {isAuthenticated && (
            <>
              {isAdmin && (
                <Button
                  component={Link}
                  href="/admin/dashboard"
                  className={styles.navButton}
                >
                  Admin
                </Button>
              )}
              <Button
                onClick={handleLogout}
                className={styles.navButtonDanger}
              >
                Logout
              </Button>
            </>
          )}
          {!isAuthenticated && (
            <Button
              component={Link}
              href="/login"
              className={styles.navButton}
            >
              Login
            </Button>
          )}
          <Box className={styles.themeToggle}>
            <Typography className={styles.themeToggleLabel}>Dark mode</Typography>
            <Switch
              checked={resolvedTheme === 'dark'}
              onChange={handleThemeToggle}
              color="default"
              inputProps={{ 'aria-label': 'Toggle dark mode' }}
            />
          </Box>
        </Box>
        {/* Mobile Nav */}
        <Box className={styles.mobileNav}>
          <IconButton
            edge="end"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            className={styles.menuButton}
          >
            <MenuIcon className={styles.menuIcon} />
          </IconButton>
          <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{ className: styles.drawerPaper }}
          >
            <List>
              {navLinks.map((link) => (
                <ListItem key={link.href} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={styles.drawerItem}
                  >
                    <ListItemText primary={link.label} />
                  </ListItemButton>
                </ListItem>
              ))}
              {isAuthenticated && hasDashboardAccess && (
                <>
                  <ListItem disablePadding>
                    <ListItemButton
                      component={Link}
                      href="/dashboard"
                      onClick={() => setDrawerOpen(false)}
                      className={styles.drawerItem}
                    >
                      <ListItemText primary="Dashboard" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton
                      component={Link}
                      href="/players"
                      onClick={() => setDrawerOpen(false)}
                      className={styles.drawerItem}
                    >
                      <ListItemText primary="Players" />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
              {isAuthenticated && (
                <>
                  {isAdmin && (
                    <ListItem disablePadding>
                      <ListItemButton
                        component={Link}
                        href="/admin/dashboard"
                        onClick={() => setDrawerOpen(false)}
                      className={styles.drawerItem}
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
                      className={`${styles.drawerItem} ${styles.drawerItemDanger}`}
                    >
                      <ListItemText primary="Logout" />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
              {!isAuthenticated && (
                <ListItem disablePadding>
                  <ListItemButton
                    component={Link}
                    href="/login"
                    onClick={() => setDrawerOpen(false)}
                    className={styles.drawerItem}
                  >
                    <ListItemText primary="Login" />
                  </ListItemButton>
                </ListItem>
              )}
              <ListItem className={styles.drawerToggleItem}>
                <ListItemText primary="Dark mode" className={styles.drawerToggleLabel} />
                <Switch
                  checked={resolvedTheme === 'dark'}
                  onChange={handleThemeToggle}
                  color="default"
                  inputProps={{ 'aria-label': 'Toggle dark mode' }}
                />
              </ListItem>
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
      <body className={inter.className}>
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
