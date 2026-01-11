'use client';

import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { HelpCircle } from 'lucide-react';

interface FieldWrapperProps {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Wrapper component for form fields with consistent styling
 * Provides label, optional hint, and required indicator
 */
export function FieldWrapper({
  label,
  hint,
  required,
  children,
}: FieldWrapperProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {hint && (
          <div className="group relative">
            <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
            <div className="absolute bottom-full left-1/2 z-50 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block">
              {hint}
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
