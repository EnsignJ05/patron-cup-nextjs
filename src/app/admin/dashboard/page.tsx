'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Link from 'next/link';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import GolfCourseIcon from '@mui/icons-material/GolfCourse';
import SportsIcon from '@mui/icons-material/Sports';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';
import LockResetIcon from '@mui/icons-material/LockReset';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import styles from './page.module.css';

const adminSections = [
  {
    title: 'Players',
    description: 'Manage player profiles, contact info, handicaps, and roles',
    href: '/admin/players',
    icon: PeopleIcon,
    colorKey: 'blue',
  },
  {
    title: 'Reset Passwords',
    description: 'Set temporary passwords and require password changes',
    href: '/admin/reset-password',
    icon: LockResetIcon,
    colorKey: 'teal',
  },
  {
    title: 'Change Username',
    description: 'Update login emails without changing the account',
    href: '/admin/change-username',
    icon: AlternateEmailIcon,
    colorKey: 'slate',
  },
  {
    title: 'Events',
    description: 'Create and manage yearly golf outings',
    href: '/admin/events',
    icon: EventIcon,
    colorKey: 'red',
  },
  {
    title: 'Participants',
    description: 'Manage event registrations and confirmations',
    href: '/admin/participants',
    icon: PeopleIcon,
    colorKey: 'purple',
  },
  {
    title: 'Teams',
    description: 'Manage teams, captains, and rosters for each event',
    href: '/admin/teams',
    icon: GroupsIcon,
    colorKey: 'green',
  },
  {
    title: 'Courses',
    description: 'Add and edit golf courses and hole information',
    href: '/admin/courses',
    icon: GolfCourseIcon,
    colorKey: 'emerald',
  },
  {
    title: 'Matches',
    description: 'Manage match schedules, players, and results',
    href: '/admin/matches',
    icon: SportsIcon,
    colorKey: 'violet',
  },
  {
    title: 'Match Setup',
    description: 'Assign players to matches and finalize pairings',
    href: '/admin/matches/setup',
    icon: AccessTimeIcon,
    colorKey: 'orange',
  },
  {
    title: 'Re-rounds',
    description: 'Manage optional re-round signups and schedules',
    href: '/admin/rerounds',
    icon: GolfCourseIcon,
    colorKey: 'sea',
  },
  {
    title: 'Scores',
    description: 'Enter and manage round scores and statistics',
    href: '/admin/scores',
    icon: ScoreboardIcon,
    colorKey: 'mint',
  },
];

export default function AdminDashboard() {
  return (
    <Box className={styles.pageRoot}>
      <Typography variant="h4" className={styles.pageTitle}>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" className={styles.pageSubtitle}>
        Manage all aspects of the Patron Cup golf events
      </Typography>

      <Box 
        className={styles.sectionGrid}
      >
        {adminSections.map((section) => {
          const IconComponent = section.icon;
          const colorClass = styles[`sectionColor${section.colorKey}`];
          return (
            <Box key={section.href}>
              <Link href={section.href} className={styles.sectionLink}>
                <Paper
                  elevation={2}
                  className={`${styles.sectionCard} ${colorClass}`}
                >
                  <Box className={styles.sectionHeader}>
                    <IconComponent
                      className={`${styles.sectionIcon} ${colorClass}`}
                    />
                    <Typography variant="h6" className={styles.sectionTitle}>
                      {section.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" className={styles.sectionDescription}>
                    {section.description}
                  </Typography>
                </Paper>
              </Link>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
