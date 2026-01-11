import { describe, it, expect } from 'vitest';
import {
  getValueType,
  buildDataTree,
  formatValuePreview,
} from '../types';

describe('Data Picker Utils', () => {
  describe('getValueType', () => {
    it('returns correct type for string', () => {
      expect(getValueType('hello')).toBe('string');
      expect(getValueType('')).toBe('string');
    });

    it('returns correct type for number', () => {
      expect(getValueType(42)).toBe('number');
      expect(getValueType(0)).toBe('number');
      expect(getValueType(-1.5)).toBe('number');
    });

    it('returns correct type for boolean', () => {
      expect(getValueType(true)).toBe('boolean');
      expect(getValueType(false)).toBe('boolean');
    });

    it('returns correct type for null', () => {
      expect(getValueType(null)).toBe('null');
    });

    it('returns correct type for array', () => {
      expect(getValueType([])).toBe('array');
      expect(getValueType([1, 2, 3])).toBe('array');
    });

    it('returns correct type for object', () => {
      expect(getValueType({})).toBe('object');
      expect(getValueType({ key: 'value' })).toBe('object');
    });
  });

  describe('buildDataTree', () => {
    it('builds tree from simple object', () => {
      const data = { name: 'John', age: 30 };
      const tree = buildDataTree(data, 'trigger');

      expect(tree).toHaveLength(2);
      expect(tree[0].key).toBe('name');
      expect(tree[0].path).toBe('trigger.name');
      expect(tree[0].value).toBe('John');
      expect(tree[0].type).toBe('string');

      expect(tree[1].key).toBe('age');
      expect(tree[1].path).toBe('trigger.age');
      expect(tree[1].value).toBe(30);
      expect(tree[1].type).toBe('number');
    });

    it('builds tree from nested object', () => {
      const data = {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      };
      const tree = buildDataTree(data, 'trigger');

      expect(tree).toHaveLength(1);
      expect(tree[0].key).toBe('user');
      expect(tree[0].path).toBe('trigger.user');
      expect(tree[0].type).toBe('object');
      expect(tree[0].children).toHaveLength(2);

      expect(tree[0].children![0].key).toBe('name');
      expect(tree[0].children![0].path).toBe('trigger.user.name');
    });

    it('builds tree from array', () => {
      const data = { items: ['a', 'b', 'c'] };
      const tree = buildDataTree(data, 'trigger');

      expect(tree).toHaveLength(1);
      expect(tree[0].key).toBe('items');
      expect(tree[0].type).toBe('array');
      expect(tree[0].children).toHaveLength(3);

      expect(tree[0].children![0].key).toBe('0');
      expect(tree[0].children![0].path).toBe('trigger.items.0');
      expect(tree[0].children![0].value).toBe('a');
    });

    it('returns empty array for null/undefined', () => {
      expect(buildDataTree(null, 'trigger')).toEqual([]);
      expect(buildDataTree(undefined, 'trigger')).toEqual([]);
    });

    it('returns empty array for primitives', () => {
      expect(buildDataTree('string' as unknown as Record<string, unknown>, 'trigger')).toEqual([]);
      expect(buildDataTree(42 as unknown as Record<string, unknown>, 'trigger')).toEqual([]);
    });

    it('handles empty base path', () => {
      const data = { key: 'value' };
      const tree = buildDataTree(data, '');

      expect(tree[0].path).toBe('key');
    });
  });

  describe('formatValuePreview', () => {
    it('formats string with quotes', () => {
      expect(formatValuePreview('hello')).toBe('"hello"');
    });

    it('truncates long strings', () => {
      const longString = 'a'.repeat(100);
      const result = formatValuePreview(longString, 50);
      expect(result).toBe(`"${'a'.repeat(50)}..."`);
    });

    it('formats number as-is', () => {
      expect(formatValuePreview(42)).toBe('42');
      expect(formatValuePreview(-3.14)).toBe('-3.14');
    });

    it('formats boolean as-is', () => {
      expect(formatValuePreview(true)).toBe('true');
      expect(formatValuePreview(false)).toBe('false');
    });

    it('formats null', () => {
      expect(formatValuePreview(null)).toBe('null');
    });

    it('formats undefined', () => {
      expect(formatValuePreview(undefined)).toBe('undefined');
    });

    it('formats array with length', () => {
      expect(formatValuePreview([1, 2, 3])).toBe('Array(3)');
      expect(formatValuePreview([])).toBe('Array(0)');
    });

    it('formats object with keys preview', () => {
      expect(formatValuePreview({ a: 1, b: 2 })).toBe('{a, b}');
      expect(formatValuePreview({ a: 1, b: 2, c: 3, d: 4 })).toBe('{a, b, c, ...}');
    });
  });
});
