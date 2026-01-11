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

// Weekday names for human-readable output
const weekdayNames: Record<string, string> = {
  '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
  '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '7': 'Sunday',
  '1-5': 'weekdays (Mon-Fri)', '0,6': 'weekends',
};

// Parse cron expression to human readable format
function describeCron(cron: string): string {
  // Check presets first
  const preset = presets.find((p) => p.value === cron);
  if (preset) return preset.label;

  const parts = cron.split(' ');
  if (parts.length !== 6) return 'Invalid schedule';

  const [second, minute, hour, day, month, weekday] = parts;

  // Every N minutes: 0 */N * * * *
  const everyNMinutes = minute.match(/^\*\/(\d+)$/);
  if (second === '0' && everyNMinutes && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return `Every ${everyNMinutes[1]} minutes`;
  }

  // Every minute: 0 * * * * *
  if (second === '0' && minute === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Every minute';
  }

  // Every N hours: 0 0 */N * * *
  const everyNHours = hour.match(/^\*\/(\d+)$/);
  if (second === '0' && minute === '0' && everyNHours && day === '*' && month === '*' && weekday === '*') {
    return `Every ${everyNHours[1]} hours`;
  }

  // Every hour: 0 0 * * * *
  if (second === '0' && minute === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Every hour';
  }

  // Specific time every day: 0 M H * * *
  if (second === '0' && /^\d+$/.test(minute) && /^\d+$/.test(hour) && day === '*' && month === '*' && weekday === '*') {
    return `Every day at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  // Specific time on weekdays: 0 M H * * 1-5
  if (second === '0' && /^\d+$/.test(minute) && /^\d+$/.test(hour) && day === '*' && month === '*') {
    const dayName = weekdayNames[weekday] || `day ${weekday}`;
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')} on ${dayName}`;
  }

  // First day of month: 0 M H 1 * *
  if (second === '0' && /^\d+$/.test(minute) && /^\d+$/.test(hour) && day === '1' && month === '*' && weekday === '*') {
    return `First day of month at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
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
              Schedule pattern (for advanced users)
            </Label>
            <Input
              value={customCron}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="0 0 9 * * 1-5"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              6 fields: sec min hour day month weekday (use * for &quot;any&quot;)
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Current schedule display - human readable first! */}
      {value && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="text-base font-semibold text-primary">{describeCron(value)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pattern: <code className="rounded bg-muted px-1">{value}</code>
          </p>
        </div>
      )}
    </div>
  );
}
