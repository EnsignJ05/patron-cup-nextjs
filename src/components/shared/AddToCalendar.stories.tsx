import type { Meta, StoryObj } from '@storybook/react';
import AddToCalendar from './AddToCalendar';

const startDate = new Date('2026-06-04T09:00:00-07:00');
const endDate = new Date('2026-06-04T13:00:00-07:00');

const meta: Meta<typeof AddToCalendar> = {
  title: 'Shared/AddToCalendar',
  component: AddToCalendar,
  args: {
    title: 'Patron Cup Opening Round',
    description: 'First round of the Patron Cup at Bandon Dunes.',
    startDate,
    endDate,
    location: 'Bandon Dunes Golf Resort',
  },
};

export default meta;

type Story = StoryObj<typeof AddToCalendar>;

export const Default: Story = {};

