/**
 * CTF Encoder - Converts JSON to Compressed Text Format
 */

import {
  JsonValue,
  JsonObject,
  JsonArray,
  EncodeOptions,
} from './types.js';
import {
  isObject,
  isArray,
  escapeString,
  haveSameStructure,
  allPrimitiveValues,
  getCommonKeys,
  isAllPrimitives,
  indent,
} from './utils.js';
import { ReferenceManager } from './references.js';
import { Optimizer } from './optimizer.js';

export class CTFEncoder {
  private options: Required<EncodeOptions>;
  private references: ReferenceManager;
  private optimizer: Optimizer;
  private usedDelimiter: string = '|';

  constructor(options: EncodeOptions = {}) {
    this.options = {
      indent: options.indent ?? 2,
      delimiter: options.delimiter ?? 'auto',
      references: options.references ?? 'auto',
      columnar: options.columnar ?? 'auto',
      schemas: options.schemas ?? false,
      optimize: options.optimize ?? 'balanced',
    };

    this.references = new ReferenceManager();
    this.optimizer = new Optimizer();
  }

  /**
   * Encode a JSON value to CTF format
   */
  encode(value: JsonValue): string {
    // Analyze data structure
    const analysis = this.optimizer.analyze(value);

    // Choose delimiter
    if (this.options.delimiter === 'auto') {
      this.usedDelimiter = this.optimizer.chooseDelimiter(analysis);
    } else {
      this.usedDelimiter = this.options.delimiter;
    }

    // Build reference table if beneficial
    const shouldUseRefs =
      this.options.references === true ||
      (this.options.references === 'auto' &&
        this.optimizer.estimateReferenceSavings(analysis) > 50);

    if (shouldUseRefs) {
      this.references.build(value);
    }

    // Encode value
    const lines: string[] = [];

    // Add reference definitions first
    if (this.references.count > 0) {
      lines.push(...this.references.getDefinitions());
      lines.push(''); // Empty line separator
    }

    // Encode main data
    // For top-level arrays, wrap with a default key
    if (isArray(value)) {
      lines.push(...this.encodeValue(value, 'data', 0));
    } else {
      lines.push(...this.encodeValue(value, '', 0));
    }

    return lines.join('\n');
  }

  /**
   * Encode any JSON value
   */
  private encodeValue(value: JsonValue, key: string, depth: number): string[] {
    if (value === null) {
      return this.encodeNull(key, depth);
    } else if (typeof value === 'boolean') {
      return this.encodeBoolean(value, key, depth);
    } else if (typeof value === 'number') {
      return this.encodeNumber(value, key, depth);
    } else if (typeof value === 'string') {
      return this.encodeString(value, key, depth);
    } else if (isArray(value)) {
      return this.encodeArray(value, key, depth);
    } else if (isObject(value)) {
      return this.encodeObject(value, key, depth);
    }
    return [];
  }

  /**
   * Encode null
   */
  private encodeNull(key: string, depth: number): string[] {
    const prefix = indent(depth, this.options.indent);
    return [`${prefix}${key}:_`];
  }

  /**
   * Encode boolean (+ for true, - for false)
   */
  private encodeBoolean(value: boolean, key: string, depth: number): string[] {
    const prefix = indent(depth, this.options.indent);
    const symbol = value ? '+' : '-';
    return [`${prefix}${key}:${symbol}`];
  }

  /**
   * Encode number
   */
  private encodeNumber(value: number, key: string, depth: number): string[] {
    const prefix = indent(depth, this.options.indent);
    return [`${prefix}${key}:${value}`];
  }

  /**
   * Encode string
   */
  private encodeString(value: string, key: string, depth: number): string[] {
    const prefix = indent(depth, this.options.indent);

    // Check if we have a reference for this value
    if (this.references.hasReference(value)) {
      const refId = this.references.getReference(value);
      return [`${prefix}${key}:^${refId}`];
    }

    const escaped = escapeString(value);
    return [`${prefix}${key}:${escaped}`];
  }

  /**
   * Encode array
   */
  private encodeArray(arr: JsonArray, key: string, depth: number): string[] {
    if (arr.length === 0) {
      const prefix = indent(depth, this.options.indent);
      return [`${prefix}${key}@0:`];
    }

    // Check format to use
    if (this.shouldUseColumnar(arr)) {
      return this.encodeColumnar(arr, key, depth);
    } else if (this.shouldUseTabular(arr)) {
      return this.encodeTabular(arr, key, depth);
    } else if (isAllPrimitives(arr)) {
      return this.encodeInlineArray(arr, key, depth);
    } else {
      return this.encodeListArray(arr, key, depth);
    }
  }

  /**
   * Check if array should use tabular format
   */
  private shouldUseTabular(arr: JsonArray): boolean {
    return arr.length >= 3 && haveSameStructure(arr) && allPrimitiveValues(arr);
  }

  /**
   * Check if array should use columnar format
   */
  private shouldUseColumnar(arr: JsonArray): boolean {
    if (this.options.columnar === false) return false;
    if (arr.length < 1000) return false;
    if (!haveSameStructure(arr)) return false;
    if (!allPrimitiveValues(arr)) return false;

    // Check for repetition
    const objects = arr as JsonObject[];
    const keys = Object.keys(objects[0]);

    for (const key of keys) {
      const values = objects.map((obj) => String(obj[key]));
      const uniqueValues = new Set(values);
      const repetitionRatio = 1 - uniqueValues.size / values.length;

      if (repetitionRatio > 0.3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Encode array in tabular format
   */
  private encodeTabular(arr: JsonArray, key: string, depth: number): string[] {
    const lines: string[] = [];
    const prefix = indent(depth, this.options.indent);
    const objects = arr as JsonObject[];
    const keys = getCommonKeys(objects);

    // Header: users@3|id,name,role:
    const header = `${prefix}${key}@${arr.length}${this.usedDelimiter}${keys.join(',')}:`;
    lines.push(header);

    // Data rows
    for (const obj of objects) {
      const values = keys.map((k) => this.formatValue(obj[k]));
      const row = `${prefix}${values.join(this.usedDelimiter)}`;
      lines.push(row);
    }

    return lines;
  }

  /**
   * Encode array in columnar format (for very large datasets)
   */
  private encodeColumnar(arr: JsonArray, key: string, depth: number): string[] {
    const lines: string[] = [];
    const prefix = indent(depth, this.options.indent);
    const objects = arr as JsonObject[];
    const keys = getCommonKeys(objects);

    // Header: data@5000||id,name,dept:
    lines.push(`${prefix}${key}@${arr.length}||${keys.join(',')}:`);

    // Column data
    for (const colKey of keys) {
      const values = objects.map((obj) => obj[colKey]);

      // Try run-length encoding for high repetition
      const encoded = this.encodeColumn(values);
      lines.push(`${prefix}|${colKey}:${encoded}`);
    }

    return lines;
  }

  /**
   * Encode a column with run-length encoding if beneficial
   */
  private encodeColumn(values: JsonValue[]): string {
    // Check if numeric range
    if (values.every((v) => typeof v === 'number')) {
      const nums = values as number[];
      const min = Math.min(...nums);
      const max = Math.max(...nums);

      // Check if sequential
      if (nums.every((n, i) => n === min + i)) {
        return `[${min}..${max}]`;
      }
    }

    // Check for run-length encoding opportunities
    const valueCounts = new Map<string, number>();
    for (const val of values) {
      const str = String(val);
      valueCounts.set(str, (valueCounts.get(str) || 0) + 1);
    }

    // If high repetition, use RLE
    if (valueCounts.size < values.length * 0.3) {
      const entries = Array.from(valueCounts.entries())
        .map(([val, count]) => `"${val}"=${count}`)
        .join(',');
      return `[${entries}]`;
    }

    // Otherwise, regular array
    const formatted = values.map((v) => this.formatValue(v));
    return `[${formatted.join(',')}]`;
  }

  /**
   * Encode inline array (primitives)
   */
  private encodeInlineArray(arr: JsonArray, key: string, depth: number): string[] {
    const prefix = indent(depth, this.options.indent);
    const values = arr.map((v) => this.formatValue(v));
    return [`${prefix}${key}:[${values.join(' ')}]`];
  }

  /**
   * Encode array as list (non-uniform objects)
   */
  private encodeListArray(arr: JsonArray, key: string, depth: number): string[] {
    const lines: string[] = [];
    const prefix = indent(depth, this.options.indent);

    lines.push(`${prefix}${key}@${arr.length}:`);

    for (const item of arr) {
      const itemLines = this.encodeValue(item, '-', depth + 1);
      lines.push(...itemLines);
    }

    return lines;
  }

  /**
   * Encode object
   */
  private encodeObject(obj: JsonObject, key: string, depth: number): string[] {
    const lines: string[] = [];
    const prefix = indent(depth, this.options.indent);

    // If we have a key, add object header
    if (key) {
      lines.push(`${prefix}${key}:`);
      depth++;
    }

    // Encode each property
    for (const [propKey, propValue] of Object.entries(obj)) {
      lines.push(...this.encodeValue(propValue, propKey, depth));
    }

    return lines;
  }

  /**
   * Format a primitive value for inline use
   */
  private formatValue(value: JsonValue): string {
    if (value === null) return '_';
    if (typeof value === 'boolean') return value ? '+' : '-';
    if (typeof value === 'number') return String(value);

    if (typeof value === 'string') {
      // Check for reference
      if (this.references.hasReference(value)) {
        const refId = this.references.getReference(value);
        return `^${refId}`;
      }
      return escapeString(value);
    }

    // Shouldn't reach here for tabular data
    return JSON.stringify(value);
  }

  /**
   * Get encoding statistics
   */
  getStats(originalJson: string, encoded: string): {
    originalBytes: number;
    encodedBytes: number;
    bytesSaved: number;
    compressionRatio: number;
    referencesUsed: number;
  } {
    const originalBytes = originalJson.length;
    const encodedBytes = encoded.length;
    const bytesSaved = originalBytes - encodedBytes;
    const compressionRatio = encodedBytes / originalBytes;

    return {
      originalBytes,
      encodedBytes,
      bytesSaved,
      compressionRatio,
      referencesUsed: this.references.count,
    };
  }
}

/**
 * Convenience function to encode JSON to CTF
 */
export function encode(value: JsonValue, options?: EncodeOptions): string {
  const encoder = new CTFEncoder(options);
  return encoder.encode(value);
}
