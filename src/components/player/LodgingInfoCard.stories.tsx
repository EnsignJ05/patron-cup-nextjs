import type { Meta, StoryObj } from '@storybook/react';
import LodgingInfoCard from './LodgingInfoCard';

const meta: Meta<typeof LodgingInfoCard> = {
  title: 'Player/LodgingInfoCard',
  component: LodgingInfoCard,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof LodgingInfoCard>;

export const DashboardVariant: Story = {
  args: {
    showConfirmationNumber: true,
    lodgingInfo: {
      buildingName: 'Chrome Lake',
      roomNumber: '204',
      roomType: 'Double Queen',
      confirmationNum: 'PC-2026-44391',
      roommates: [
        { id: 'player-2', name: 'Tyler Woods' },
        { id: 'player-3', name: 'Chris Cooper' },
      ],
    },
    emptyMessage: 'No room assignment found for you yet.',
  },
};

export const PlayerProfileVariant: Story = {
  args: {
    showConfirmationNumber: false,
    lodgingInfo: {
      buildingName: 'Lily Pond',
      roomNumber: '17B',
      roomType: 'Suite',
      roommates: [
        { id: 'player-7', name: 'Alex Brooks' },
        { id: 'player-8', name: 'Jordan Parker' },
      ],
    },
    emptyMessage: 'No room assignment found for this player yet.',
  },
};

export const Empty: Story = {
  args: {
    showConfirmationNumber: true,
    lodgingInfo: null,
  },
};
