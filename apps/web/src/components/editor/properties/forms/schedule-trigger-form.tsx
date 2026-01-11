'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldWrapper, CronBuilder } from '../components';

interface ScheduleTriggerFormProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

// Common timezones for selection
const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Moscow', label: 'Moscow (UTC+3)' },
  { value: 'Europe/London', label: 'London (UTC+0/+1)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1/+2)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
];

export function ScheduleTriggerForm({ data, onUpdate }: ScheduleTriggerFormProps) {
  const label = (data.label as string) || 'Schedule Trigger';
  const cron = (data.cron as string) || '0 * * * * *';
  const timezone = (data.timezone as string) || 'UTC';

  return (
    <div className="space-y-4">
      {/* Node label */}
      <FieldWrapper label="Name" hint="Display name for this node">
        <Input
          value={label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="My Schedule"
        />
      </FieldWrapper>

      {/* Schedule selection with CronBuilder */}
      <FieldWrapper
        label="Schedule"
        hint="When should this workflow run?"
        required
      >
        <CronBuilder
          value={cron}
          onChange={(newCron) => onUpdate({ cron: newCron })}
        />
      </FieldWrapper>

      {/* Timezone */}
      <FieldWrapper
        label="Timezone"
        hint="The timezone for schedule execution"
      >
        <Select value={timezone} onValueChange={(v) => onUpdate({ timezone: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select timezone..." />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldWrapper>

      {/* Help section */}
      <div className="rounded-md border border-dashed p-3">
        <h4 className="mb-2 text-sm font-medium">How it works</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Your workflow will automatically run on the selected schedule</li>
          <li>• Make sure to activate the workflow after saving</li>
          <li>• Missed executions (e.g., during downtime) are not retried</li>
        </ul>
      </div>
    </div>
  );
}
