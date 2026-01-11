import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { DataTree } from '../data-tree';

describe('DataTree', () => {
  const mockData = {
    name: 'John',
    age: 30,
    email: 'john@example.com',
  };

  const nestedData = {
    user: {
      name: 'John',
      profile: {
        avatar: 'url',
      },
    },
    items: ['a', 'b', 'c'],
  };

  it('renders data fields', () => {
    const onSelect = vi.fn();
    render(
      <DataTree data={mockData} basePath="trigger" onSelect={onSelect} />
    );

    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('age')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('shows value preview for primitives', () => {
    const onSelect = vi.fn();
    render(
      <DataTree data={mockData} basePath="trigger" onSelect={onSelect} />
    );

    expect(screen.getByText('"John"')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    const onSelect = vi.fn();
    render(<DataTree data={{}} basePath="trigger" onSelect={onSelect} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('calls onSelect with correct path when clicking Insert', () => {
    const onSelect = vi.fn();
    render(
      <DataTree data={mockData} basePath="trigger" onSelect={onSelect} />
    );

    // Find and click the Insert button for "name" field
    const insertButtons = screen.getAllByText('Insert');
    fireEvent.click(insertButtons[0]);

    expect(onSelect).toHaveBeenCalledWith('trigger.name');
  });

  it('renders nested objects with children', () => {
    const onSelect = vi.fn();
    render(
      <DataTree data={nestedData} basePath="trigger" onSelect={onSelect} />
    );

    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('items')).toBeInTheDocument();
    // Should show array length
    expect(screen.getByText('[3]')).toBeInTheDocument();
  });

  it('expands nested objects by default at first level', () => {
    const onSelect = vi.fn();
    render(
      <DataTree data={nestedData} basePath="trigger" onSelect={onSelect} />
    );

    // First level should be expanded
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('profile')).toBeInTheDocument();
  });

  it('filters nodes based on search query', () => {
    const onSelect = vi.fn();
    render(
      <DataTree
        data={mockData}
        basePath="trigger"
        onSelect={onSelect}
        searchQuery="email"
      />
    );

    expect(screen.getByText('email')).toBeInTheDocument();
    // Other fields should not be visible
    expect(screen.queryByText('name')).not.toBeInTheDocument();
    expect(screen.queryByText('age')).not.toBeInTheDocument();
  });

  it('highlights search matches', () => {
    const onSelect = vi.fn();
    render(
      <DataTree
        data={mockData}
        basePath="trigger"
        onSelect={onSelect}
        searchQuery="email"
      />
    );

    // Check that the highlight mark exists
    const mark = document.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent).toBe('email');
  });

  it('handles arrays correctly', () => {
    const onSelect = vi.fn();
    const arrayData = { items: [{ id: 1 }, { id: 2 }] };
    render(
      <DataTree data={arrayData} basePath="trigger" onSelect={onSelect} />
    );

    expect(screen.getByText('items')).toBeInTheDocument();
    expect(screen.getByText('[2]')).toBeInTheDocument();
  });
});
