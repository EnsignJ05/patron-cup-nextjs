import { render, screen } from '@testing-library/react';
import FormPage from '@/components/shared/FormPage';

describe('FormPage', () => {
  it('renders title, subtitle, alerts, and children', () => {
    render(
      <FormPage title="Form Title" subtitle="Form subtitle" error="Oops" success="Saved">
        <div>Form body</div>
      </FormPage>,
    );

    expect(screen.getByText('Form Title')).toBeInTheDocument();
    expect(screen.getByText('Form subtitle')).toBeInTheDocument();
    expect(screen.getByText('Oops')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Form body')).toBeInTheDocument();
  });
});
