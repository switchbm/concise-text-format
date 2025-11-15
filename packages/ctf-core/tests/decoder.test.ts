/**
 * Tests for CTF Decoder
 */

import { describe, it, expect } from 'vitest';
import { decode } from '../src/decoder.js';

describe('CTFDecoder', () => {
  describe('primitives', () => {
    it('decodes null', () => {
      const result = decode('value:_');
      expect(result).toEqual({ value: null });
    });

    it('decodes true', () => {
      const result = decode('active:+');
      expect(result).toEqual({ active: true });
    });

    it('decodes false', () => {
      const result = decode('disabled:-');
      expect(result).toEqual({ disabled: false });
    });

    it('decodes numbers', () => {
      expect(decode('age:32')).toEqual({ age: 32 });
      expect(decode('price:99.99')).toEqual({ price: 99.99 });
      expect(decode('count:0')).toEqual({ count: 0 });
      expect(decode('negative:-42')).toEqual({ negative: -42 });
    });

    it('decodes simple strings', () => {
      expect(decode('name:Alice')).toEqual({ name: 'Alice' });
      expect(decode('city:NYC')).toEqual({ city: 'NYC' });
    });

    it('decodes quoted strings', () => {
      const result = decode('text:"Contains: special | chars"');
      expect(result).toEqual({ text: 'Contains: special | chars' });
    });
  });

  describe('objects', () => {
    it('decodes flat objects', () => {
      const input = `id:123
name:Alice
active:+`;

      const result = decode(input);
      expect(result).toEqual({
        id: 123,
        name: 'Alice',
        active: true,
      });
    });

    it('decodes nested objects', () => {
      const input = `user:
  id:123
  name:Alice`;

      const result = decode(input);
      expect(result).toEqual({
        user: {
          id: 123,
          name: 'Alice',
        },
      });
    });
  });

  describe('inline arrays', () => {
    it('decodes empty arrays', () => {
      const result = decode('items@0:');
      expect(result).toEqual({ items: [] });
    });

    it('decodes primitive arrays', () => {
      const result = decode('tags:[admin ops dev]');
      expect(result).toEqual({ tags: ['admin', 'ops', 'dev'] });
    });

    it('decodes number arrays', () => {
      const result = decode('scores:[95 87 92]');
      expect(result).toEqual({ scores: [95, 87, 92] });
    });

    it('decodes boolean arrays', () => {
      const result = decode('flags:[+ - +]');
      expect(result).toEqual({ flags: [true, false, true] });
    });
  });

  describe('tabular arrays', () => {
    it('decodes tabular format', () => {
      const input = `users@3|id,name,role:
1|Alice|admin
2|Bob|user
3|Charlie|dev`;

      const result = decode(input);
      expect(result).toEqual({
        users: [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'user' },
          { id: 3, name: 'Charlie', role: 'dev' },
        ],
      });
    });

    it('decodes tabular with booleans', () => {
      const input = `items@3|id,active:
1|+
2|-
3|+`;

      const result = decode(input);
      expect(result).toEqual({
        items: [
          { id: 1, active: true },
          { id: 2, active: false },
          { id: 3, active: true },
        ],
      });
    });

    it('decodes tabular with comma delimiter', () => {
      const input = `users@2,id,name:
1,Alice
2,Bob`;

      const result = decode(input);
      expect(result).toEqual({
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      });
    });
  });

  describe('references', () => {
    it('decodes references', () => {
      const input = `^1=Engineering

items@3|dept:
^1
^1
^1`;

      const result = decode(input);
      expect(result).toEqual({
        items: [
          { dept: 'Engineering' },
          { dept: 'Engineering' },
          { dept: 'Engineering' },
        ],
      });
    });

    it('decodes quoted references', () => {
      const input = `^1="Engineering Department"

dept:^1`;

      const result = decode(input);
      expect(result).toEqual({ dept: 'Engineering Department' });
    });

    it('decodes multiple references', () => {
      const input = `^1=Engineering
^2=Sales

employees@3|name,dept:
Alice|^1
Bob|^2
Charlie|^1`;

      const result = decode(input);
      expect(result).toEqual({
        employees: [
          { name: 'Alice', dept: 'Engineering' },
          { name: 'Bob', dept: 'Sales' },
          { name: 'Charlie', dept: 'Engineering' },
        ],
      });
    });
  });

  describe('complex structures', () => {
    it('decodes mixed nested data', () => {
      const input = `config:
  theme:dark
  count:42
  enabled:+
users@3|id,name,active:
1|Alice|+
2|Bob|-
3|Charlie|+`;

      const result = decode(input);
      expect(result).toEqual({
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
      });
    });
  });
});
