import type { Meta, StoryObj } from '@storybook/react';
import Card from './Card';

const meta: Meta<typeof Card> = {
  title: 'Shared/Card',
  component: Card,
  args: {
    children: 'This is a card with some example content.',
  },
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {};

