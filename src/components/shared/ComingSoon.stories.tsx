import type { Meta, StoryObj } from '@storybook/react';
import ComingSoon from './ComingSoon';

const meta: Meta<typeof ComingSoon> = {
  title: 'Shared/ComingSoon',
  component: ComingSoon,
  args: {
    message: 'Detailed content about this section will be available closer to the event.',
  },
};

export default meta;

type Story = StoryObj<typeof ComingSoon>;

export const Default: Story = {};

