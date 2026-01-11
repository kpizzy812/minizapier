import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAvailableData } from '../use-available-data';

// Mock the workflow store
vi.mock('@/stores/workflow-store', () => ({
  useWorkflowStore: vi.fn(),
}));

import { useWorkflowStore } from '@/stores/workflow-store';

describe('useAvailableData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no node is selected', () => {
    vi.mocked(useWorkflowStore).mockReturnValue({
      nodes: [],
      edges: [],
      selectedNodeId: null,
    } as unknown as ReturnType<typeof useWorkflowStore>);

    const { result } = renderHook(() => useAvailableData());

    expect(result.current).toEqual([]);
  });

  it('returns trigger data for nodes connected to trigger', () => {
    vi.mocked(useWorkflowStore).mockReturnValue({
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhookTrigger',
          data: { label: 'My Webhook' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'action-1',
          type: 'httpRequest',
          data: { label: 'HTTP Request' },
          position: { x: 200, y: 0 },
        },
      ],
      edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1' }],
      selectedNodeId: 'action-1',
    } as unknown as ReturnType<typeof useWorkflowStore>);

    const { result } = renderHook(() => useAvailableData());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('trigger');
    expect(result.current[0].name).toContain('Trigger');
    expect(result.current[0].data).toHaveProperty('body');
  });

  it('returns data from multiple predecessor nodes', () => {
    vi.mocked(useWorkflowStore).mockReturnValue({
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhookTrigger',
          data: { label: 'Webhook' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'transform-1',
          type: 'transform',
          data: { label: 'Transform Data' },
          position: { x: 200, y: 0 },
        },
        {
          id: 'action-1',
          type: 'httpRequest',
          data: { label: 'HTTP Request' },
          position: { x: 400, y: 0 },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'transform-1' },
        { id: 'e2', source: 'transform-1', target: 'action-1' },
      ],
      selectedNodeId: 'action-1',
    } as unknown as ReturnType<typeof useWorkflowStore>);

    const { result } = renderHook(() => useAvailableData());

    // Should have trigger and transform
    expect(result.current).toHaveLength(2);
    expect(result.current[0].id).toBe('trigger');
    expect(result.current[1].id).toBe('transform-1');
  });

  it('uses sample data when provided', () => {
    vi.mocked(useWorkflowStore).mockReturnValue({
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhookTrigger',
          data: { label: 'Webhook' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'action-1',
          type: 'httpRequest',
          data: { label: 'HTTP' },
          position: { x: 200, y: 0 },
        },
      ],
      edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1' }],
      selectedNodeId: 'action-1',
    } as unknown as ReturnType<typeof useWorkflowStore>);

    const sampleData = {
      'trigger-1': {
        body: { customField: 'customValue' },
      },
    };

    const { result } = renderHook(() => useAvailableData(sampleData));

    expect(result.current[0].data).toEqual({
      body: { customField: 'customValue' },
    });
  });

  it('returns sample data for different trigger types', () => {
    vi.mocked(useWorkflowStore).mockReturnValue({
      nodes: [
        {
          id: 'trigger-1',
          type: 'scheduleTrigger',
          data: { label: 'Schedule' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'action-1',
          type: 'httpRequest',
          data: {},
          position: { x: 200, y: 0 },
        },
      ],
      edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1' }],
      selectedNodeId: 'action-1',
    } as unknown as ReturnType<typeof useWorkflowStore>);

    const { result } = renderHook(() => useAvailableData());

    expect(result.current[0].data).toHaveProperty('timestamp');
    expect(result.current[0].data).toHaveProperty('cron');
  });

  it('returns data in execution order (triggers first)', () => {
    vi.mocked(useWorkflowStore).mockReturnValue({
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhookTrigger',
          data: { label: 'Webhook' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'transform-1',
          type: 'transform',
          data: { label: 'Transform' },
          position: { x: 200, y: 0 },
        },
        {
          id: 'http-1',
          type: 'httpRequest',
          data: { label: 'HTTP' },
          position: { x: 400, y: 0 },
        },
        {
          id: 'final-1',
          type: 'sendEmail',
          data: { label: 'Email' },
          position: { x: 600, y: 0 },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'transform-1' },
        { id: 'e2', source: 'transform-1', target: 'http-1' },
        { id: 'e3', source: 'http-1', target: 'final-1' },
      ],
      selectedNodeId: 'final-1',
    } as unknown as ReturnType<typeof useWorkflowStore>);

    const { result } = renderHook(() => useAvailableData());

    // First should be trigger, then transform, then http
    expect(result.current[0].id).toBe('trigger');
    expect(result.current[1].id).toBe('transform-1');
    expect(result.current[2].id).toBe('http-1');
  });
});
