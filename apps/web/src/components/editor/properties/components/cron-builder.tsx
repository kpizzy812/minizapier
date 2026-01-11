'use client';

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CronBuilderProps {
  value: string;
  onChange: (cron: string) => void;
}

// Predefined schedule presets for easy selection
const presets = [
  { label: 'Every minute', value: '0 * * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '0 */5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '0 */15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '0 */30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', value: '0 0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every day at midnight', value: '0 0 0 * * *', description: 'Runs at 00:00 every day' },
  { label: 'Every day at 9 AM', value: '0 0 9 * * *', description: 'Runs at 09:00 every day' },
  { label: 'Every Monday at 9 AM', value: '0 0 9 * * 1', description: 'Runs at 09:00 every Monday' },
  { label: 'Weekdays at 9 AM', value: '0 0 9 * * 1-5', description: 'Runs at 09:00 Mon-Fri' },
  { label: 'First day of month', value: '0 0 0 1 * *', description: 'Runs at midnight on the 1st' },
];

// Parse cron expression to human readable format
function describeCron(cron: string): string {
  const preset = presets.find((p) => p.value === cron);
  if (preset) return preset.description;

  const parts = cron.split(' ');
  if (parts.length !== 6) return 'Custom schedule';

  // Try to generate a simple description
  const [second, minute, hour, day, month, weekday] = parts;

  if (second === '0' && minute === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Every minute';
  }
  if (second === '0' && minute === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Every hour';
  }
  if (second === '0' && minute === '0' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
    return `Every day at ${hour.padStart(2, '0')}:00`;
  }

  return 'Custom schedule';
}

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  // Check if current value matches a preset
  const matchingPreset = useMemo(
    () => presets.find((p) => p.value === value),
    [value]
  );

  // Compute initial mode based on whether value matches a preset
  const initialMode = matchingPreset ? 'preset' : (value ? 'custom' : 'preset');
  const [mode, setMode] = useState<'preset' | 'custom'>(initialMode);
  const [customCron, setCustomCron] = useState(value || '');

  const handlePresetChange = (presetValue: string) => {
    onChange(presetValue);
  };

  const handleCustomChange = (newValue: string) => {
    setCustomCron(newValue);
    // Basic validation: 6 space-separated parts
    const parts = newValue.trim().split(/\s+/);
    if (parts.length === 6) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'preset' | 'custom')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preset">Quick Select</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="preset" className="mt-3 space-y-3">
          <Select
            value={matchingPreset?.value || ''}
            onValueChange={handlePresetChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select schedule..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  <div className="flex flex-col">
                    <span>{preset.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {preset.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TabsContent>

        <TabsContent value="custom" className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Cron expression (6 fields)
            </Label>
            <Input
              value={customCron}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="0 0 9 * * 1-5"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Format: second minute hour day month weekday
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Current schedule display */}
      {value && (
        <div className="rounded-md bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Current schedule:</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {value}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-medium">{describeCron(value)}</p>
        </div>
      )}
    </div>
  );
}
