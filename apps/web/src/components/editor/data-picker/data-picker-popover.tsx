'use client';

import { useState, useMemo } from 'react';
import { Search, Database, Webhook, Clock, Mail, Zap, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { DataTree } from './data-tree';
import { DataSource } from './types';

interface DataPickerPopoverProps {
  sources: DataSource[];
  onSelect: (path: string) => void;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Icons for different source types
const sourceIcons: Record<string, React.ReactNode> = {
  trigger: <Zap className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  schedule: <Clock className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  step: <Database className="h-4 w-4" />,
};

function getSourceIcon(sourceId: string): React.ReactNode {
  // Check if sourceId starts with known prefixes
  if (sourceId === 'trigger' || sourceId.includes('Trigger')) {
    return sourceIcons.trigger;
  }
  return sourceIcons.step;
}

export function DataPickerPopover({
  sources,
  onSelect,
  trigger,
  open,
  onOpenChange,
}: DataPickerPopoverProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(sources[0]?.id || '');

  // Filter sources based on search
  const hasSearchResults = useMemo(() => {
    if (!searchQuery) return true;
    // Check if any source has matching data
    return sources.some((source) => {
      const checkObject = (obj: unknown, prefix: string = ''): boolean => {
        if (obj === null || obj === undefined) return false;
        if (typeof obj !== 'object') return false;

        return Object.entries(obj as Record<string, unknown>).some(
          ([key, value]) => {
            const path = prefix ? `${prefix}.${key}` : key;
            if (
              key.toLowerCase().includes(searchQuery.toLowerCase()) ||
              path.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
              return true;
            }
            if (typeof value === 'object' && value !== null) {
              return checkObject(value, path);
            }
            return false;
          }
        );
      };
      return checkObject(source.data);
    });
  }, [sources, searchQuery]);

  const handleSelect = (path: string) => {
    onSelect(path);
    onOpenChange?.(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {/* Header with search */}
        <div className="border-b p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Insert Data</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onOpenChange?.(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8"
            />
          </div>
        </div>

        {/* Content with tabs */}
        {sources.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {sources.length > 1 && (
              <div className="border-b px-3 pt-2 overflow-x-auto">
                <TabsList className="h-8 w-max min-w-full justify-start bg-transparent p-0 gap-1">
                  {sources.map((source) => (
                    <TabsTrigger
                      key={source.id}
                      value={source.id}
                      className={cn(
                        'h-8 px-3 text-xs rounded-b-none border-b-2 border-transparent shrink-0',
                        'data-[state=active]:border-primary data-[state=active]:bg-transparent',
                        'data-[state=active]:shadow-none'
                      )}
                    >
                      <span className="mr-1.5">{getSourceIcon(source.id)}</span>
                      {source.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            )}

            <ScrollArea className="h-[300px]">
              {sources.map((source) => (
                <TabsContent
                  key={source.id}
                  value={source.id}
                  className="m-0 p-2"
                >
                  {source.description && (
                    <p className="text-xs text-muted-foreground px-2 mb-2">
                      {source.description}
                    </p>
                  )}
                  <DataTree
                    data={source.data}
                    basePath={source.id}
                    onSelect={handleSelect}
                    searchQuery={searchQuery}
                  />
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        ) : (
          <div className="p-6 text-center">
            <Database className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No data available
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect a trigger to this action first
            </p>
          </div>
        )}

        {/* No search results */}
        {searchQuery && !hasSearchResults && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No fields matching &quot;{searchQuery}&quot;
          </div>
        )}

        {/* Footer with hint */}
        <div className="border-t px-3 py-2 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Click on a field to insert its value
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
