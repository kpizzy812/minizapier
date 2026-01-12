'use client';

import { useState, useRef, useCallback } from 'react';
import { Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DataPickerPopover } from './data-picker-popover';
import { DataSource } from './types';

interface TemplateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sources: DataSource[];
  className?: string;
  multiline?: boolean;
  rows?: number;
}

/**
 * Input component with integrated Data Picker
 * Allows inserting template variables like {{trigger.body.field}}
 */
export function TemplateInput({
  value,
  onChange,
  placeholder,
  sources,
  className,
  multiline = false,
  rows = 3,
}: TemplateInputProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  // Store cursor position in ref to avoid race conditions with focus loss
  const cursorPositionRef = useRef<number | null>(null);

  // Update cursor position in both state and ref
  const updateCursorPosition = useCallback((position: number | null) => {
    setCursorPosition(position);
    cursorPositionRef.current = position;
  }, []);

  // Track cursor position on input events
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
      updateCursorPosition(e.target.selectionStart);
    },
    [onChange, updateCursorPosition]
  );

  // Update cursor position on selection change
  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      updateCursorPosition(target.selectionStart);
    },
    [updateCursorPosition]
  );

  // Also track on key up for arrow key navigation
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      updateCursorPosition(target.selectionStart);
    },
    [updateCursorPosition]
  );

  // Insert selected path at cursor position
  const handleDataSelect = useCallback(
    (path: string) => {
      const template = `{{${path}}}`;
      // Use ref for the most recent cursor position (avoids race conditions with focus loss)
      const position = cursorPositionRef.current ?? cursorPosition ?? value.length;

      const newValue =
        value.slice(0, position) + template + value.slice(position);

      onChange(newValue);

      // Set cursor after inserted template
      const newCursorPosition = position + template.length;
      updateCursorPosition(newCursorPosition);

      // Focus input and set cursor position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(
            newCursorPosition,
            newCursorPosition
          );
        }
      }, 0);
    },
    [value, cursorPosition, onChange, updateCursorPosition]
  );

  // Handle mousedown on button - capture cursor position BEFORE focus is lost
  const handlePickerButtonMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Prevent default to keep input focused (preserves cursor position)
      e.preventDefault();

      // Save current cursor position before opening
      if (inputRef.current) {
        const position = inputRef.current.selectionStart;
        updateCursorPosition(position);
      }
      setIsPickerOpen(true);
    },
    [updateCursorPosition]
  );

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="relative">
      <div className="relative">
        <InputComponent
          ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          onSelect={handleSelect}
          onClick={handleSelect}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          className={cn('pr-10 font-mono text-sm', className)}
          {...(multiline ? { rows } : {})}
        />

        {/* Data picker button */}
        <DataPickerPopover
          sources={sources}
          onSelect={handleDataSelect}
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'absolute right-1 h-7 w-7',
                multiline ? 'top-1' : 'top-1/2 -translate-y-1/2',
                'text-muted-foreground hover:text-foreground'
              )}
              onMouseDown={handlePickerButtonMouseDown}
              title="Insert data from previous steps"
            >
              <Database className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      {/* Show hint if value contains templates */}
      {value.includes('{{') && (
        <p className="mt-1 text-xs text-muted-foreground">
          Variables like{' '}
          <code className="bg-muted px-1 rounded">{'{{...}}'}</code> will be
          replaced with actual data at runtime
        </p>
      )}
    </div>
  );
}
