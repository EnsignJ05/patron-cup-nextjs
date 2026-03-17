import type { Meta, StoryObj } from '@storybook/react';
import FormPage from './FormPage';

const meta: Meta<typeof FormPage> = {
  title: 'Shared/FormPage',
  component: FormPage,
  args: {
    title: 'Sign in',
    subtitle: 'Use your Patron Cup account to continue.',
    children: <div>Form fields go here</div>,
  },
};

export default meta;

type Story = StoryObj<typeof FormPage>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: 'Something went wrong. Please try again.',
  },
};

export const WithSuccess: Story = {
  args: {
    success: 'Your changes have been saved.',
  },
};

