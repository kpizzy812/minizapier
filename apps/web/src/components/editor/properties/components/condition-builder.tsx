'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DataPickerPopover } from '../../data-picker';
import type { DataSource } from '../../data-picker';

// Operators for different value types
const operators = [
  { value: '===', label: 'equals', hint: 'Exact match' },
  { value: '!==', label: 'not equals', hint: 'Not exact match' },
  { value: '>', label: 'greater than', hint: 'Number comparison' },
  { value: '>=', label: 'greater or equal', hint: 'Number comparison' },
  { value: '<', label: 'less than', hint: 'Number comparison' },
  { value: '<=', label: 'less or equal', hint: 'Number comparison' },
  { value: 'contains', label: 'contains', hint: 'Text contains' },
  { value: 'startsWith', label: 'starts with', hint: 'Text starts with' },
  { value: 'endsWith', label: 'ends with', hint: 'Text ends with' },
  { value: 'exists', label: 'exists', hint: 'Value is not empty' },
  { value: 'notExists', label: 'not exists', hint: 'Value is empty' },
];

interface ConditionRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ConditionBuilderProps {
  expression: string;
  onChange: (expression: string) => void;
  dataSources: DataSource[];
}

// Parse expression to rules
function parseExpression(expr: string): ConditionRule[] {
  if (!expr || expr.trim() === '') {
    return [{ id: '1', field: '', operator: '===', value: '' }];
  }

  // Try to parse simple conditions like: {{field}} === "value" or {{field}} > 100
  const simpleMatch = expr.match(
    /^\{\{([^}]+)\}\}\s*(===|!==|>|>=|<|<=)\s*(.+)$/
  );
  if (simpleMatch) {
    const [, field, op, val] = simpleMatch;
    // Remove quotes from string values
    const cleanVal = val.replace(/^["']|["']$/g, '').trim();
    return [{ id: '1', field: field.trim(), operator: op, value: cleanVal }];
  }

  // Try to parse contains/startsWith/endsWith
  const methodMatch = expr.match(
    /^\{\{([^}]+)\}\}\.(includes|startsWith|endsWith)\(["']([^"']+)["']\)$/
  );
  if (methodMatch) {
    const [, field, method, val] = methodMatch;
    const opMap: Record<string, string> = {
      includes: 'contains',
      startsWith: 'startsWith',
      endsWith: 'endsWith',
    };
    return [{ id: '1', field: field.trim(), operator: opMap[method], value: val }];
  }

  // Try to parse exists check
  const existsMatch = expr.match(/^\{\{([^}]+)\}\}\s*(!=|!==)\s*(undefined|null)$/);
  if (existsMatch) {
    return [{ id: '1', field: existsMatch[1].trim(), operator: 'exists', value: '' }];
  }

  // Can't parse - return empty rule
  return [{ id: '1', field: '', operator: '===', value: '' }];
}

// Convert rules to expression
function rulesToExpression(rules: ConditionRule[]): string {
  if (rules.length === 0) return '';

  const rule = rules[0]; // For now, single rule
  if (!rule.field) return '';

  const field = `{{${rule.field}}}`;

  switch (rule.operator) {
    case '===':
    case '!==':
      // Auto-detect if value is number
      const isNum = !isNaN(Number(rule.value)) && rule.value.trim() !== '';
      return isNum
        ? `${field} ${rule.operator} ${rule.value}`
        : `${field} ${rule.operator} "${rule.value}"`;
    case '>':
    case '>=':
    case '<':
    case '<=':
      return `${field} ${rule.operator} ${rule.value}`;
    case 'contains':
      return `${field}.includes("${rule.value}")`;
    case 'startsWith':
      return `${field}.startsWith("${rule.value}")`;
    case 'endsWith':
      return `${field}.endsWith("${rule.value}")`;
    case 'exists':
      return `${field} !== undefined && ${field} !== null`;
    case 'notExists':
      return `${field} === undefined || ${field} === null`;
    default:
      return '';
  }
}

// Get value from data sources by path
function getValueByPath(dataSources: DataSource[], path: string): unknown {
  // Path format: "sourceId.nested.path"
  const parts = path.split('.');
  if (parts.length === 0) return undefined;

  const sourceId = parts[0];
  const source = dataSources.find((s) => s.id === sourceId);
  if (!source) return undefined;

  let value: unknown = source.data;
  for (let i = 1; i < parts.length; i++) {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[parts[i]];
  }

  return value;
}

// Evaluate condition with sample data
function evaluateCondition(
  rule: ConditionRule,
  dataSources: DataSource[]
): { result: boolean | null; sampleValue: unknown; hasData: boolean } {
  if (!rule.field) {
    return { result: null, sampleValue: undefined, hasData: false };
  }

  const sampleValue = getValueByPath(dataSources, rule.field);
  const hasData = sampleValue !== undefined;

  if (!hasData) {
    return { result: null, sampleValue: undefined, hasData: false };
  }

  try {
    let result: boolean;
    const compareValue = rule.value;

    switch (rule.operator) {
      case '===':
        // Try numeric comparison first
        if (!isNaN(Number(sampleValue)) && !isNaN(Number(compareValue))) {
          result = Number(sampleValue) === Number(compareValue);
        } else {
          result = String(sampleValue) === compareValue;
        }
        break;
      case '!==':
        if (!isNaN(Number(sampleValue)) && !isNaN(Number(compareValue))) {
          result = Number(sampleValue) !== Number(compareValue);
        } else {
          result = String(sampleValue) !== compareValue;
        }
        break;
      case '>':
        result = Number(sampleValue) > Number(compareValue);
        break;
      case '>=':
        result = Number(sampleValue) >= Number(compareValue);
        break;
      case '<':
        result = Number(sampleValue) < Number(compareValue);
        break;
      case '<=':
        result = Number(sampleValue) <= Number(compareValue);
        break;
      case 'contains':
        result = String(sampleValue).includes(compareValue);
        break;
      case 'startsWith':
        result = String(sampleValue).startsWith(compareValue);
        break;
      case 'endsWith':
        result = String(sampleValue).endsWith(compareValue);
        break;
      case 'exists':
        result = sampleValue !== undefined && sampleValue !== null;
        break;
      case 'notExists':
        result = sampleValue === undefined || sampleValue === null;
        break;
      default:
        return { result: null, sampleValue, hasData };
    }

    return { result, sampleValue, hasData };
  } catch {
    return { result: null, sampleValue, hasData };
  }
}

// Format value for display
function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ConditionBuilder({
  expression,
  onChange,
  dataSources,
}: ConditionBuilderProps) {
  const [rules, setRules] = useState<ConditionRule[]>(() =>
    parseExpression(expression)
  );
  const [dataPickerOpen, setDataPickerOpen] = useState(false);

  // Update expression when rules change
  useEffect(() => {
    const newExpr = rulesToExpression(rules);
    if (newExpr !== expression) {
      onChange(newExpr);
    }
  }, [rules, onChange, expression]);

  const updateRule = (id: string, updates: Partial<ConditionRule>) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const rule = rules[0];
  const needsValue = !['exists', 'notExists'].includes(rule.operator);

  // Evaluate condition with sample data
  const evaluation = useMemo(
    () => evaluateCondition(rule, dataSources),
    [rule, dataSources]
  );

  const handleFieldSelect = (path: string) => {
    updateRule(rule.id, { field: path });
    setDataPickerOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Field selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Field to check
        </label>
        <DataPickerPopover
          sources={dataSources}
          onSelect={handleFieldSelect}
          open={dataPickerOpen}
          onOpenChange={setDataPickerOpen}
          trigger={
            <Button
              variant="outline"
              className={cn(
                'w-full justify-between font-mono text-sm h-9',
                !rule.field && 'text-muted-foreground'
              )}
            >
              {rule.field ? `{{${rule.field}}}` : 'Select field...'}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          }
        />
      </div>

      {/* Operator selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Condition
        </label>
        <Select
          value={rule.operator}
          onValueChange={(v) => updateRule(rule.id, { operator: v })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                <span className="flex items-center gap-2">
                  <span>{op.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {op.hint}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Value input */}
      {needsValue && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Value
          </label>
          <Input
            value={rule.value}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
            placeholder="Enter value..."
            className="h-9"
          />
        </div>
      )}

      {/* Live Preview with validation */}
      {rule.field && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>

          {/* Sample value */}
          {evaluation.hasData && (
            <div className="text-xs">
              <span className="text-muted-foreground">Sample: </span>
              <code className="font-mono bg-muted px-1 rounded">
                {formatValue(evaluation.sampleValue)}
              </code>
            </div>
          )}

          {/* Expression */}
          <div className="text-xs">
            <span className="text-muted-foreground">Expression: </span>
            <code className="font-mono break-all">
              {rulesToExpression(rules)}
            </code>
          </div>

          {/* Result */}
          {evaluation.hasData ? (
            <div
              className={cn(
                'flex items-center gap-2 p-2 rounded-md text-sm font-medium',
                evaluation.result === true && 'bg-green-500/10 text-green-700 dark:text-green-400',
                evaluation.result === false && 'bg-red-500/10 text-red-700 dark:text-red-400',
                evaluation.result === null && 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
              )}
            >
              {evaluation.result === true && (
                <>
                  <Check className="h-4 w-4" />
                  <span>TRUE — goes to green branch</span>
                </>
              )}
              {evaluation.result === false && (
                <>
                  <X className="h-4 w-4" />
                  <span>FALSE — goes to red branch</span>
                </>
              )}
              {evaluation.result === null && (
                <>
                  <HelpCircle className="h-4 w-4" />
                  <span>Cannot evaluate</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-xs text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Connect trigger to see preview</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
