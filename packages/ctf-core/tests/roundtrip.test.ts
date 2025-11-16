/**
 * Round-trip tests - ensure encode/decode preserves data
 */

import { describe, it, expect } from 'vitest';
import { encode, decode } from '../src/index.js';

describe('Round-trip encoding', () => {
  it('preserves primitives', () => {
    const original = {
      null: null,
      true: true,
      false: false,
      number: 42,
      float: 3.14,
      string: 'hello',
    };

    const encoded = encode(original);
    const decoded = decode(encoded);

    expect(decoded).toEqual(original);
  });

  it('preserves nested objects', () => {
    const original = {
      user: {
        id: 123,
        profile: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
    };

    const encoded = encode(original);
    const decoded = decode(encoded);

    expect(decoded).toEqual(original);
  });

  it('preserves tabular arrays', () => {
    const original = {
      users: [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
        { id: 3, name: 'Charlie', active: true },
      ],
    };

    const encoded = encode(original);
    const decoded = decode(encoded);

    expect(decoded).toEqual(original);
  });

  it('preserves inline arrays', () => {
    const original = {
      tags: ['admin', 'ops', 'dev'],
      scores: [95, 87, 92],
      flags: [true, false, true],
    };

    const encoded = encode(original);
    const decoded = decode(encoded);

    expect(decoded).toEqual(original);
  });

  it('preserves data with references', () => {
    const original = {
      employees: [
        { name: 'Alice', dept: 'Engineering Department' },
        { name: 'Bob', dept: 'Engineering Department' },
        { name: 'Charlie', dept: 'Engineering Department' },
      ],
    };

    const encoded = encode(original, { references: true });
    const decoded = decode(encoded);

    expect(decoded).toEqual(original);
  });

  it('preserves complex mixed structures', () => {
    const original = {
      config: {
        theme: 'dark',
        notifications: true,
        maxItems: 100,
      },
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
        { id: 3, name: 'Charlie', role: 'dev' },
      ],
      tags: ['production', 'critical'],
      metadata: {
        version: '1.0.0',
        created: '2024-01-01',
      },
    };

    const encoded = encode(original);
    const decoded = decode(encoded);

    expect(decoded).toEqual(original);
  });

  it('preserves special characters in strings', () => {
    const original = {
      text: 'Contains: pipes | commas, tabs\t and "quotes"',
      path: 'C:\\Users\\Alice\\Documents',
    };

    const encoded = encode(original);
    const decoded = decode(encoded);

    expect(decoded).toEqual(original);
  });

  it('preserves empty arrays and objects', () => {
    const original = {
      emptyArray: [],
      emptyObject: {},
      nested: {
        alsoEmpty: {},
      },
    };

    const encoded = encode(original);
    const decoded = decode(encoded);

    expect(decoded.emptyArray).toEqual([]);
    expect(decoded.nested).toBeDefined();
  });

  it('works with different delimiters', () => {
    const original = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ],
    };

    const delimiters = ['|', ',', '\t'] as const;

    for (const delimiter of delimiters) {
      const encoded = encode(original, { delimiter });
      const decoded = decode(encoded);
      expect(decoded).toEqual(original);
    }
  });
});
