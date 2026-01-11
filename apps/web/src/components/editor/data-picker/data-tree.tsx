'use client';

import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Braces,
  List,
  Type,
  Hash,
  ToggleLeft,
  CircleSlash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DataTreeNode,
  DataValueType,
  buildDataTree,
  formatValuePreview,
} from './types';

interface DataTreeProps {
  data: Record<string, unknown>;
  basePath: string;
  onSelect: (path: string) => void;
  searchQuery?: string;
}

// Icons for different value types
const typeIcons: Record<DataValueType, React.ReactNode> = {
  string: <Type className="h-3.5 w-3.5 text-green-600" />,
  number: <Hash className="h-3.5 w-3.5 text-blue-600" />,
  boolean: <ToggleLeft className="h-3.5 w-3.5 text-purple-600" />,
  null: <CircleSlash className="h-3.5 w-3.5 text-gray-400" />,
  object: <Braces className="h-3.5 w-3.5 text-amber-600" />,
  array: <List className="h-3.5 w-3.5 text-cyan-600" />,
};

// Colors for value preview
const typeColors: Record<DataValueType, string> = {
  string: 'text-green-700 dark:text-green-400',
  number: 'text-blue-700 dark:text-blue-400',
  boolean: 'text-purple-700 dark:text-purple-400',
  null: 'text-gray-500',
  object: 'text-muted-foreground',
  array: 'text-muted-foreground',
};

interface TreeNodeProps {
  node: DataTreeNode;
  level: number;
  onSelect: (path: string) => void;
  searchQuery?: string;
  defaultExpanded?: boolean;
}

function TreeNode({
  node,
  level,
  onSelect,
  searchQuery,
  defaultExpanded = false,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 1);

  const hasChildren = node.children && node.children.length > 0;
  const isExpandable = node.type === 'object' || node.type === 'array';

  // Check if this node or its children match search
  const matchesSearch = useMemo(() => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    // Check current node
    if (node.key.toLowerCase().includes(query)) return true;
    if (node.path.toLowerCase().includes(query)) return true;

    // Check children recursively
    const checkChildren = (children: DataTreeNode[] | undefined): boolean => {
      if (!children) return false;
      return children.some(
        (child) =>
          child.key.toLowerCase().includes(query) ||
          child.path.toLowerCase().includes(query) ||
          checkChildren(child.children)
      );
    };

    return checkChildren(node.children);
  }, [node, searchQuery]);

  if (!matchesSearch) return null;

  const handleClick = () => {
    if (isExpandable && hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);
  };

  // Highlight search match in text
  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const query = searchQuery.toLowerCase();
    const index = text.toLowerCase().indexOf(query);
    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {text.slice(index, index + searchQuery.length)}
        </mark>
        {text.slice(index + searchQuery.length)}
      </>
    );
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 py-1 px-1 rounded-sm cursor-pointer',
          'hover:bg-accent/50 transition-colors',
          level > 0 && 'ml-4'
        )}
        onClick={handleClick}
      >
        {/* Expand/collapse icon */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isExpandable && hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : null}
        </span>

        {/* Type icon */}
        <span className="flex-shrink-0">{typeIcons[node.type]}</span>

        {/* Key name */}
        <span className="font-medium text-sm truncate">
          {highlightText(node.key)}
        </span>

        {/* Value preview (for primitives) */}
        {!isExpandable && (
          <span
            className={cn(
              'text-xs truncate max-w-[120px]',
              typeColors[node.type]
            )}
          >
            {formatValuePreview(node.value, 30)}
          </span>
        )}

        {/* Array length badge */}
        {node.type === 'array' && (
          <span className="text-xs text-muted-foreground">
            [{(node.value as unknown[]).length}]
          </span>
        )}

        {/* Insert button */}
        <button
          onClick={handleSelect}
          className={cn(
            'ml-auto px-2 py-0.5 text-xs rounded',
            'bg-primary/10 text-primary hover:bg-primary/20',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'flex-shrink-0'
          )}
        >
          Insert
        </button>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="border-l border-border/50 ml-2">
          {node.children!.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DataTree({
  data,
  basePath,
  onSelect,
  searchQuery,
}: DataTreeProps) {
  const tree = useMemo(() => buildDataTree(data, basePath), [data, basePath]);

  if (tree.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          level={0}
          onSelect={onSelect}
          searchQuery={searchQuery}
          defaultExpanded={true}
        />
      ))}
    </div>
  );
}
