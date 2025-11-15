/**
 * Utility functions for CTF encoding/decoding
 */

import { JsonValue, JsonObject, JsonArray } from './types.js';

/**
 * Check if a value is a plain object
 */
export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is an array
 */
export function isArray(value: unknown): value is JsonArray {
  return Array.isArray(value);
}

/**
 * Check if a value is a primitive
 */
export function isPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Check if a string needs quoting in CTF format
 */
export function needsQuoting(str: string): boolean {
  // Quote if contains special characters or starts with digits
  return /[:|\t\n\r"\[\]{},^@]/.test(str) || /^\d/.test(str) || str.includes('  ');
}

/**
 * Escape a string for CTF format
 */
export function escapeString(str: string): string {
  if (!needsQuoting(str)) {
    return str;
  }
  // Escape quotes and backslashes
  return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/**
 * Unescape a CTF string
 */
export function unescapeString(str: string): string {
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1);
  }
  return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/**
 * Check if all arrays have the same structure (for tabular format)
 */
export function haveSameStructure(arr: JsonValue[]): boolean {
  if (arr.length === 0) return false;
  if (!arr.every(isObject)) return false;

  const objects = arr as JsonObject[];
  const firstKeys = Object.keys(objects[0]).sort();

  return objects.every((obj) => {
    const keys = Object.keys(obj).sort();
    return keys.length === firstKeys.length && keys.every((k, i) => k === firstKeys[i]);
  });
}

/**
 * Check if all values in objects are primitives
 */
export function allPrimitiveValues(arr: JsonValue[]): boolean {
  if (!arr.every(isObject)) return false;

  return (arr as JsonObject[]).every((obj) =>
    Object.values(obj).every(isPrimitive)
  );
}

/**
 * Get common keys from array of objects
 */
export function getCommonKeys(arr: JsonObject[]): string[] {
  if (arr.length === 0) return [];
  return Object.keys(arr[0]);
}

/**
 * Count occurrences of substrings in a string
 */
export function countOccurrences(str: string, substring: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(substring, pos)) !== -1) {
    count++;
    pos += substring.length;
  }
  return count;
}

/**
 * Estimate token count (rough approximation)
 * Typically 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  // Rough heuristic: split on whitespace and punctuation
  const tokens = text.split(/[\s,:|{}[\]()]+/).filter(Boolean);
  return tokens.length;
}

/**
 * Deep clone a JSON value
 */
export function deepClone<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Check if an array contains only primitives
 */
export function isAllPrimitives(arr: JsonValue[]): boolean {
  return arr.every(isPrimitive);
}

/**
 * Format indentation
 */
export function indent(level: number, spaces: number = 2): string {
  return ' '.repeat(level * spaces);
}
