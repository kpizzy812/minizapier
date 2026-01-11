import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { TemplateInput } from '../template-input';
import type { DataSource } from '../types';

const mockSources: DataSource[] = [
  {
    id: 'trigger',
    name: 'Webhook',
    description: 'Data from webhook trigger',
    data: {
      body: {
        name: 'John',
        email: 'john@example.com',
      },
      headers: {
        'content-type': 'application/json',
      },
    },
  },
];

describe('TemplateInput', () => {
  it('renders input with value', () => {
    const onChange = vi.fn();
    render(
      <TemplateInput
        value="Hello {{trigger.body.name}}"
        onChange={onChange}
        sources={mockSources}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Hello {{trigger.body.name}}');
  });

  it('renders with placeholder', () => {
    const onChange = vi.fn();
    render(
      <TemplateInput
        value=""
        onChange={onChange}
        placeholder="Enter value"
        sources={mockSources}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter value');
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(
      <TemplateInput value="" onChange={onChange} sources={mockSources} />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(onChange).toHaveBeenCalledWith('new value');
  });

  it('renders data picker button', () => {
    const onChange = vi.fn();
    render(
      <TemplateInput value="" onChange={onChange} sources={mockSources} />
    );

    // Should have a button to open data picker
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute(
      'title',
      'Insert data from previous steps'
    );
  });

  it('shows hint when value contains templates', () => {
    const onChange = vi.fn();
    render(
      <TemplateInput
        value="Hello {{name}}"
        onChange={onChange}
        sources={mockSources}
      />
    );

    expect(
      screen.getByText(/Variables like/i)
    ).toBeInTheDocument();
  });

  it('does not show hint when value has no templates', () => {
    const onChange = vi.fn();
    render(
      <TemplateInput
        value="Hello world"
        onChange={onChange}
        sources={mockSources}
      />
    );

    expect(screen.queryByText(/Variables like/i)).not.toBeInTheDocument();
  });

  it('renders as textarea when multiline is true', () => {
    const onChange = vi.fn();
    render(
      <TemplateInput
        value=""
        onChange={onChange}
        sources={mockSources}
        multiline
        rows={5}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
  });

  it('renders as input when multiline is false', () => {
    const onChange = vi.fn();
    render(
      <TemplateInput
        value=""
        onChange={onChange}
        sources={mockSources}
        multiline={false}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input.tagName.toLowerCase()).toBe('input');
  });

  it('applies custom className', () => {
    const onChange = vi.fn();
    render(
      <TemplateInput
        value=""
        onChange={onChange}
        sources={mockSources}
        className="custom-class"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  // Note: Popover interaction test is skipped due to ResizeObserver mock issues in JSDOM
  // The popover functionality should be tested in E2E tests
});
