import type { Meta, StoryObj } from '@storybook/react';
import MatchCard from './MatchCard';

const meta: Meta<typeof MatchCard> = {
  title: 'Matches/MatchCard',
  component: MatchCard,
  parameters: {
    layout: 'padded',
  },
  args: {
    matchNumber: 3,
    matchType: 'Four-ball',
    teeTime: '9:30 AM',
    isHalved: false,
    winnerTeamId: 'team-a',
    showCardOutline: true,
    teamA: {
      id: 'team-a',
      name: 'Team Thompson',
      color: '#3498db',
      players: [
        {
          id: 'p1',
          name: 'Alex Johnson',
          handicap: 4,
          profileImageUrl: null,
        },
        {
          id: 'p2',
          name: 'Sam Lee',
          handicap: 7,
          profileImageUrl: null,
        },
      ],
    },
    teamB: {
      id: 'team-b',
      name: 'Team Burgess',
      color: '#e74c3c',
      players: [
        {
          id: 'p3',
          name: 'Jordan Blake',
          handicap: 6,
          profileImageUrl: null,
        },
        {
          id: 'p4',
          name: 'Casey Reed',
          handicap: 8,
          profileImageUrl: null,
        },
      ],
    },
  },
};

export default meta;

type Story = StoryObj<typeof MatchCard>;

export const WinnerHighlighted: Story = {};

export const Halved: Story = {
  args: {
    isHalved: true,
    winnerTeamId: null,
  },
};

export const Pending: Story = {
  args: {
    teeTime: 'TBD',
    winnerTeamId: null,
    showCardOutline: false,
  },
};

export const WithDateAndCourse: Story = {
  args: {
    matchDateLabel: 'Monday, April 13, 2026',
    courseLabel: 'Bandon Dunes',
  },
};
