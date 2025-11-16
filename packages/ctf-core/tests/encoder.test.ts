/**
 * Tests for CTF Encoder
 */

import { describe, it, expect } from 'vitest';
import { encode } from '../src/encoder.js';

describe('CTFEncoder', () => {
  describe('primitives', () => {
    it('encodes null as _', () => {
      expect(encode({ value: null })).toBe('value:_');
    });

    it('encodes true as +', () => {
      expect(encode({ active: true })).toBe('active:+');
    });

    it('encodes false as -', () => {
      expect(encode({ disabled: false })).toBe('disabled:-');
    });

    it('encodes numbers', () => {
      expect(encode({ age: 32 })).toBe('age:32');
      expect(encode({ price: 99.99 })).toBe('price:99.99');
      expect(encode({ count: 0 })).toBe('count:0');
      expect(encode({ negative: -42 })).toBe('negative:-42');
    });

    it('encodes simple strings', () => {
      expect(encode({ name: 'Alice' })).toBe('name:Alice');
      expect(encode({ city: 'NYC' })).toBe('city:NYC');
    });

    it('quotes strings with special characters', () => {
      const result = encode({ text: 'Contains: special | chars' });
      expect(result).toContain('"Contains: special | chars"');
    });

    it('quotes strings with spaces', () => {
      const result = encode({ city: 'San Francisco' });
      expect(result).toContain('"San Francisco"');
    });
  });

  describe('objects', () => {
    it('encodes flat objects', () => {
      const data = { id: 123, name: 'Alice', active: true };
      const result = encode(data);

      expect(result).toContain('id:123');
      expect(result).toContain('name:Alice');
      expect(result).toContain('active:+');
    });

    it('encodes nested objects', () => {
      const data = {
        user: {
          id: 123,
          name: 'Alice',
        },
      };

      const result = encode(data);
      expect(result).toContain('user:');
      expect(result).toContain('id:123');
      expect(result).toContain('name:Alice');
    });
  });

  describe('inline arrays', () => {
    it('encodes empty arrays', () => {
      expect(encode({ items: [] })).toBe('items@0:');
    });

    it('encodes primitive arrays inline', () => {
      const result = encode({ tags: ['admin', 'ops', 'dev'] });
      expect(result).toBe('tags:[admin ops dev]');
    });

    it('encodes number arrays inline', () => {
      const result = encode({ scores: [95, 87, 92] });
      expect(result).toBe('scores:[95 87 92]');
    });

    it('encodes boolean arrays inline', () => {
      const result = encode({ flags: [true, false, true] });
      expect(result).toBe('flags:[+ - +]');
    });
  });

  describe('tabular arrays', () => {
    it('uses tabular format for 3+ uniform objects', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'user' },
          { id: 3, name: 'Charlie', role: 'dev' },
        ],
      };

      const result = encode(data);
      expect(result).toContain('users@3');
      expect(result).toContain('id,name,role:');
      expect(result).toMatch(/1[|,]Alice[|,]admin/);
      expect(result).toMatch(/2[|,]Bob[|,]user/);
      expect(result).toMatch(/3[|,]Charlie[|,]dev/);
    });

    it('includes booleans in tabular format', () => {
      const data = {
        items: [
          { id: 1, active: true },
          { id: 2, active: false },
          { id: 3, active: true },
        ],
      };

      const result = encode(data);
      expect(result).toContain('items@3');
      expect(result).toMatch(/1[|,]\+/);
      expect(result).toMatch(/2[|,]-/);
    });

    it('does not use tabular for less than 3 items', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      };

      const result = encode(data);
      // Should use list format
      expect(result).toContain('users@2:');
      expect(result).not.toContain('id,name:');
    });

    it('does not use tabular for non-uniform objects', () => {
      const data = {
        items: [
          { id: 1, name: 'Alice' },
          { id: 2, email: 'bob@example.com' },
          { id: 3, name: 'Charlie' },
        ],
      };

      const result = encode(data);
      expect(result).not.toContain('id,name:');
    });
  });

  describe('reference compression', () => {
    it('creates references for values appearing 3+ times', () => {
      const data = {
        items: [
          { dept: 'Engineering' },
          { dept: 'Engineering' },
          { dept: 'Engineering' },
        ],
      };

      const result = encode(data, { references: true });
      expect(result).toContain('^1=Engineering');
      expect(result).toContain('^1');
    });

    it('does not create references for short strings', () => {
      const data = {
        items: [
          { type: 'A' },
          { type: 'A' },
          { type: 'A' },
        ],
      };

      const result = encode(data, { references: true });
      expect(result).not.toContain('^1=A');
    });

    it('uses references in tabular arrays', () => {
      const data = {
        employees: [
          { name: 'Alice', dept: 'Engineering Department' },
          { name: 'Bob', dept: 'Engineering Department' },
          { name: 'Charlie', dept: 'Engineering Department' },
        ],
      };

      const result = encode(data, { references: true });
      expect(result).toContain('^1="Engineering Department"');
      expect(result).toMatch(/Alice[|,]\^1/);
    });

    it('can disable references', () => {
      const data = {
        items: [
          { dept: 'Engineering' },
          { dept: 'Engineering' },
          { dept: 'Engineering' },
        ],
      };

      const result = encode(data, { references: false });
      expect(result).not.toContain('^1=');
    });
  });

  describe('delimiter selection', () => {
    it('uses | as default delimiter', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
        ],
      };

      const result = encode(data, { delimiter: '|' });
      expect(result).toContain('|');
      expect(result).toContain('users@3|id,name:');
    });

    it('can use comma delimiter', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
        ],
      };

      const result = encode(data, { delimiter: ',' });
      expect(result).toContain('users@3,id,name:');
    });

    it('can use tab delimiter', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
        ],
      };

      const result = encode(data, { delimiter: '\t' });
      expect(result).toContain('users@3\tid,name:');
    });
  });

  describe('complex structures', () => {
    it('encodes mixed nested data', () => {
      const data = {
        config: {
          theme: 'dark',
          count: 42,
          enabled: true,
        },
        users: [
          { id: 1, name: 'Alice', active: true },
          { id: 2, name: 'Bob', active: false },
          { id: 3, name: 'Charlie', active: true },
        ],
      };

      const result = encode(data);

      expect(result).toContain('config:');
      expect(result).toContain('theme:dark');
      expect(result).toContain('count:42');
      expect(result).toContain('enabled:+');
      expect(result).toContain('users@3');
    });
  });
});
