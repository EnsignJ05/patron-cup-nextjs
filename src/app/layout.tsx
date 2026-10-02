"use client";
import React, { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Image from 'next/image';
import IconButton from '@mui/material/IconButton';
import { Analytics } from '@vercel/analytics/react';
import { Inter, Newsreader, JetBrains_Mono, IBM_Plex_Sans } from 'next/font/google';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { canAccessDashboard, isAdminRole, isAdminPath } from '@/lib/authConfig';
import { ADMIN_NAV_GROUPS } from '@/lib/adminNavGroups';
import { AIcon } from '@/components/admin/AdminIcons';
import { useRouter, usePathname } from 'next/navigation';
import './globals.css';
import styles from './layout.module.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains-mono',
});
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
});

const THEME_STORAGE_KEY = 'theme-preference';
type ThemePreference = 'light' | 'dark';

function useThemeManager() {
  const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') setThemePreference(saved);
    else setThemePreference(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.matchMedia !== 'function') {
      const t = themePreference === 'dark' ? 'dark' : 'light';
      setResolvedTheme(t);
      document.documentElement.setAttribute('data-theme', t);
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (pref: ThemePreference | null) => {
      const t = pref ?? (media.matches ? 'dark' : 'light');
      setResolvedTheme(t);
      document.documentElement.setAttribute('data-theme', t);
    };
    apply(themePreference);
    const onChange = (e: MediaQueryListEvent) => {
      if (!themePreference) {
        const t = e.matches ? 'dark' : 'light';
        setResolvedTheme(t);
        document.documentElement.setAttribute('data-theme', t);
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [themePreference]);

  const applyTheme = (next: ThemePreference) => {
    setThemePreference(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  return { resolvedTheme, applyTheme };
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────
function DesktopSidebar({
  resolvedTheme,
  toggleTheme,
}: {
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
}) {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const isAuthenticated = Boolean(user);
  const isAdmin = isAdminRole(role);
  const hasDashboardAccess = canAccessDashboard(role);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const links = [
    { label: 'Home',    href: '/',         icon: 'home'  },
    { label: 'FAQ',     href: '/faq',      icon: 'help'  },
    { label: 'Matches', href: '/matches',  icon: 'flag'  },
    { label: 'Roster',  href: '/roster',   icon: 'users' },
    ...(isAuthenticated && hasDashboardAccess
      ? [{ label: 'Dashboard', href: '/dashboard',       icon: 'user' }]
      : []),
    ...(isAuthenticated && isAdmin
      ? [{ label: 'Admin',     href: '/admin/dashboard', icon: 'user' }]
      : []),
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const inAdmin = isAdminPath(pathname);

  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.sidebarLogo}>
        <div className={styles.sidebarLogoImg}>
          <Image
            src="/gallery/patron-logo.png"
            alt="Patron Cup Logo"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        <span className={styles.sidebarWordmark}>Patron Cup</span>
      </Link>

      {inAdmin ? (
        <nav className={styles.sidebarNav}>
          <Link
            href="/"
            className={styles.sidebarLink}
          >
            <span className={styles.sidebarLinkIcon}>
              <AIcon name="back" size={16} />
            </span>
            <span>Back to site</span>
          </Link>
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.name}>
              <div className={styles.sidebarGroupLabel}>
                <span className={styles.sidebarGroupDot} style={{ background: group.color }} />
                <span>{group.name}</span>
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.sidebarLink} ${isActive(item.href) ? styles.sidebarLinkActive : ''}`}
                >
                  <span className={styles.sidebarLinkIcon}>
                    <AIcon name={item.icon} size={18} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      ) : (
        <nav className={styles.sidebarNav}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.sidebarLink} ${isActive(link.href) ? styles.sidebarLinkActive : ''}`}
            >
              <span className={styles.sidebarLinkIcon}>
                <TabIcon name={link.icon} />
              </span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      )}

      <div className={styles.sidebarFooter}>
        <button
          className={styles.sidebarThemeBtn}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          <span>{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        {isAuthenticated ? (
          <button onClick={handleLogout} className={styles.sidebarLogoutBtn}>
            Logout
          </button>
        ) : (
          <Link href="/login" className={styles.sidebarLoginLink}>
            Login
          </Link>
        )}
      </div>
    </aside>
  );
}

// ── Mobile top bar ────────────────────────────────────────────────────────────
function MobileAppBar({
  resolvedTheme,
  toggleTheme,
}: {
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
}) {
  return (
    <AppBar position="static" color="transparent" elevation={0} className={styles.appBar}>
      <Toolbar className={styles.toolbar}>
        <Box component={Link} href="/" className={styles.logoLink}>
          <Image
            src="/gallery/patron-logo.png"
            alt="Patron Cup Logo"
            fill
            className={styles.logoImage}
            priority
          />
        </Box>
        <Box className={styles.mobileNav}>
          <IconButton
            aria-label="Toggle theme"
            className={styles.menuButton}
            onClick={toggleTheme}
          >
            {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

// ── NavigationContent — kept for backward compatibility ───────────────────────
export function NavigationContent() {
  const { resolvedTheme, applyTheme } = useThemeManager();
  return (
    <MobileAppBar
      resolvedTheme={resolvedTheme}
      toggleTheme={() => applyTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    />
  );
}

// ── Mobile bottom tab bar ─────────────────────────────────────────────────────
function MobileTabBar() {
  const pathname = usePathname();
  const { user, role } = useAuth();
  const isAuthenticated = Boolean(user);
  const hasDashboardAccess = canAccessDashboard(role);

  const tabs = [
    { label: 'Home',    href: '/',        icon: 'home'  },
    { label: 'FAQ',     href: '/faq',     icon: 'help'  },
    { label: 'Matches', href: '/matches', icon: 'flag'  },
    { label: 'Roster',  href: '/roster',  icon: 'users' },
    isAuthenticated && hasDashboardAccess
      ? { label: 'Dashboard', href: '/dashboard', icon: 'user' }
      : { label: 'Login',     href: '/login',     icon: 'user' },
  ] as const;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className={styles.tabBar}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`${styles.tab} ${isActive(tab.href) ? styles.tabActive : ''}`}
        >
          <span className={styles.tabIcon}><TabIcon name={tab.icon} /></span>
          <span className={styles.tabLabel}>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}

// ── App shell — owns theme state, renders sidebar + mobile nav ────────────────
function AppShell({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, applyTheme } = useThemeManager();
  const toggleTheme = () => applyTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <div className={styles.shell}>
      <DesktopSidebar resolvedTheme={resolvedTheme} toggleTheme={toggleTheme} />
      <div className={styles.mainArea}>
        <MobileAppBar resolvedTheme={resolvedTheme} toggleTheme={toggleTheme} />
        <main>{children}</main>
        <MobileTabBar />
      </div>
    </div>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
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
      <body
        className={`${inter.className} ${newsreader.variable} ${jetbrainsMono.variable} ${ibmPlexSans.variable}`}
      >
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}

// ── Icon helpers ──────────────────────────────────────────────────────────────
function TabIcon({ name }: { name: string }) {
  const s = { width: 22, height: 22, display: 'block' } as const;
  const g = {
    stroke: 'currentColor',
    strokeWidth: 1.6,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  } as const;
  switch (name) {
    case 'home': return (
      <svg viewBox="0 0 24 24" style={s}><g {...g}>
        <path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>
      </g></svg>
    );
    case 'help': return (
      <svg viewBox="0 0 24 24" style={s}><g {...g}>
        <circle cx="12" cy="12" r="9"/>
        <path d="M9.2 9.2a3 3 0 015.6 1.3c0 1.7-2.4 2.2-2.4 3.7"/>
        <circle cx="12" cy="17.2" r="0.7" fill="currentColor" stroke="none"/>
      </g></svg>
    );
    case 'flag': return (
      <svg viewBox="0 0 24 24" style={s}><g {...g}>
        <line x1="6" y1="3" x2="6" y2="21"/>
        <path d="M6 4h12l-3 4 3 4H6"/>
      </g></svg>
    );
    case 'users': return (
      <svg viewBox="0 0 24 24" style={s}><g {...g}>
        <circle cx="9" cy="9" r="3.2"/>
        <circle cx="17" cy="10" r="2.5"/>
        <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5"/>
        <path d="M14 14c2.5 0 7 1.2 7 5"/>
      </g></svg>
    );
    case 'user': return (
      <svg viewBox="0 0 24 24" style={s}><g {...g}>
        <circle cx="12" cy="9" r="3.5"/>
        <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>
      </g></svg>
    );
    default: return null;
  }
}

function SunIcon() {
  const g = {
    stroke: 'currentColor',
    strokeWidth: 1.8,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  } as const;
  return (
    <svg width={22} height={22} viewBox="0 0 24 24"><g {...g}>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>
    </g></svg>
  );
}

function MoonIcon() {
  const g = {
    stroke: 'currentColor',
    strokeWidth: 1.8,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  } as const;
  return (
    <svg width={22} height={22} viewBox="0 0 24 24"><g {...g}>
      <path d="M20 15.5A8 8 0 1 1 8.5 4 6.5 6.5 0 0 0 20 15.5z"/>
    </g></svg>
  );
}
