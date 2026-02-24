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

const adminSections = [
  {
    title: 'Players',
    description: 'Manage player profiles, contact info, handicaps, and roles',
    href: '/admin/players',
    icon: PeopleIcon,
    color: '#3498db',
  },
  {
    title: 'Reset Passwords',
    description: 'Set temporary passwords and require password changes',
    href: '/admin/reset-password',
    icon: LockResetIcon,
    color: '#1f8a70',
  },
  {
    title: 'Change Username',
    description: 'Update login emails without changing the account',
    href: '/admin/change-username',
    icon: AlternateEmailIcon,
    color: '#5d6d7e',
  },
  {
    title: 'Events',
    description: 'Create and manage yearly golf outings',
    href: '/admin/events',
    icon: EventIcon,
    color: '#e74c3c',
  },
  {
    title: 'Participants',
    description: 'Manage event registrations and confirmations',
    href: '/admin/participants',
    icon: PeopleIcon,
    color: '#8e44ad',
  },
  {
    title: 'Teams',
    description: 'Manage teams, captains, and rosters for each event',
    href: '/admin/teams',
    icon: GroupsIcon,
    color: '#2ecc71',
  },
  {
    title: 'Courses',
    description: 'Add and edit golf courses and hole information',
    href: '/admin/courses',
    icon: GolfCourseIcon,
    color: '#27ae60',
  },
  {
    title: 'Matches',
    description: 'Manage match schedules, players, and results',
    href: '/admin/matches',
    icon: SportsIcon,
    color: '#9b59b6',
  },
  {
    title: 'Match Setup',
    description: 'Assign players to matches and finalize pairings',
    href: '/admin/matches/setup',
    icon: AccessTimeIcon,
    color: '#f39c12',
  },
  {
    title: 'Re-rounds',
    description: 'Manage optional re-round signups and schedules',
    href: '/admin/rerounds',
    icon: GolfCourseIcon,
    color: '#16a085',
  },
  {
    title: 'Scores',
    description: 'Enter and manage round scores and statistics',
    href: '/admin/scores',
    icon: ScoreboardIcon,
    color: '#1abc9c',
  },
];

export default function AdminDashboard() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" sx={{ color: '#666', mb: 4 }}>
        Manage all aspects of the Patron Cup golf events
      </Typography>

      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 3 
        }}
      >
        {adminSections.map((section) => {
          const IconComponent = section.icon;
          return (
            <Box key={section.href}>
              <Link href={section.href} style={{ textDecoration: 'none' }}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    borderLeft: `4px solid ${section.color}`,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <IconComponent sx={{ fontSize: 40, color: section.color, mr: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                      {section.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
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
