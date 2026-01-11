/**
 * Types for Data Picker component
 * Used for visual data mapping in workflow editor
 */

// Represents a node in the data tree
export interface DataTreeNode {
  key: string;
  path: string;
  value: unknown;
  type: DataValueType;
  children?: DataTreeNode[];
}

// Possible value types for display
export type DataValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'object'
  | 'array';

// Source of data (for grouping in UI)
export interface DataSource {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  data: Record<string, unknown>;
}

// Props for the main DataPicker component
export interface DataPickerProps {
  // Available data sources (trigger, previous steps, etc.)
  sources: DataSource[];
  // Callback when user selects a field
  onSelect: (path: string) => void;
  // Optional: highlight search query
  searchQuery?: string;
}

// Props for TemplateInput component
export interface TemplateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sources: DataSource[];
  className?: string;
  multiline?: boolean;
}

/**
 * Determines the type of a value for display purposes
 */
export function getValueType(value: unknown): DataValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const type = typeof value;
  if (type === 'object') return 'object';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  return 'string';
}

/**
 * Builds a tree structure from a data object
 */
export function buildDataTree(
  data: unknown,
  basePath: string = ''
): DataTreeNode[] {
  if (data === null || data === undefined) {
    return [];
  }

  if (typeof data !== 'object') {
    return [];
  }

  const entries = Array.isArray(data)
    ? data.map((item, index) => [String(index), item] as const)
    : Object.entries(data as Record<string, unknown>);

  return entries.map(([key, value]) => {
    const path = basePath ? `${basePath}.${key}` : key;
    const type = getValueType(value);
    const node: DataTreeNode = {
      key,
      path,
      value,
      type,
    };

    if (type === 'object' || type === 'array') {
      node.children = buildDataTree(value, path);
    }

    return node;
  });
}

/**
 * Formats a value for preview display
 */
export function formatValuePreview(value: unknown, maxLength: number = 50): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const type = typeof value;

  if (type === 'string') {
    const str = value as string;
    if (str.length > maxLength) {
      return `"${str.slice(0, maxLength)}..."`;
    }
    return `"${str}"`;
  }

  if (type === 'number' || type === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (type === 'object') {
    const keys = Object.keys(value as object);
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;
  }

  return String(value);
}
