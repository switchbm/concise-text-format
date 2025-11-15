/**
 * CTF Decoder - Converts Compressed Text Format to JSON
 */

import {
  JsonValue,
  JsonObject,
  JsonArray,
  DecodeOptions,
  CTFParseError,
  CTFValidationError,
} from './types.js';
import { unescapeString } from './utils.js';

interface ParseContext {
  lines: string[];
  currentLine: number;
  references: Map<number, string>;
  options: Required<DecodeOptions>;
}

export class CTFDecoder {
  private options: Required<DecodeOptions>;

  constructor(options: DecodeOptions = {}) {
    this.options = {
      strict: options.strict ?? true,
      validate: options.validate ?? true,
      typeHints: options.typeHints ?? true,
    };
  }

  /**
   * Decode CTF format to JSON
   */
  decode(input: string): JsonValue {
    const lines = input.split('\n').map((line) => line.trimEnd());

    const context: ParseContext = {
      lines,
      currentLine: 0,
      references: new Map(),
      options: this.options,
    };

    // Parse reference definitions first
    this.parseReferences(context);

    // Parse main data
    return this.parseValue(context, 0);
  }

  /**
   * Parse reference definitions (^1=value)
   */
  private parseReferences(context: ParseContext): void {
    while (context.currentLine < context.lines.length) {
      const line = context.lines[context.currentLine];

      // Skip empty lines
      if (line.trim() === '') {
        context.currentLine++;
        continue;
      }

      // Check if it's a reference definition
      const refMatch = line.match(/^\^(\d+)=(.+)$/);
      if (refMatch) {
        const id = parseInt(refMatch[1], 10);
        let value = refMatch[2];

        // Unescape if quoted
        if (value.startsWith('"') && value.endsWith('"')) {
          value = unescapeString(value);
        }

        context.references.set(id, value);
        context.currentLine++;
      } else {
        // Not a reference, stop parsing references
        break;
      }
    }
  }

  /**
   * Parse a value at the current context
   */
  private parseValue(context: ParseContext, baseIndent: number): JsonValue {
    const result: JsonObject = {};

    while (context.currentLine < context.lines.length) {
      const line = context.lines[context.currentLine];

      // Skip empty lines
      if (line.trim() === '') {
        context.currentLine++;
        continue;
      }

      const indent = this.getIndentLevel(line);

      // If indent is less than base, we're done with this level
      if (indent < baseIndent) {
        break;
      }

      // If indent is greater than base, skip (will be handled by nested parse)
      if (indent > baseIndent) {
        break;
      }

      // Parse this line
      const trimmed = line.trim();

      // Check for key:value
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        throw new CTFParseError(
          `Expected ':' in line`,
          context.currentLine + 1
        );
      }

      const keyPart = trimmed.substring(0, colonIndex);
      const valuePart = trimmed.substring(colonIndex + 1);

      // Check for array notation
      const arrayMatch = keyPart.match(/^(.+?)@(\d+)(\|{1,2})(.*?)$/);
      if (arrayMatch) {
        const key = arrayMatch[1];
        const count = parseInt(arrayMatch[2], 10);
        const delimiter = arrayMatch[3];
        const fields = arrayMatch[4];

        context.currentLine++;

        if (delimiter === '||') {
          // Columnar array
          result[key] = this.parseColumnarArray(context, count, fields, indent);
        } else {
          // Tabular array
          result[key] = this.parseTabularArray(
            context,
            count,
            fields,
            delimiter,
            indent
          );
        }
      } else {
        // Regular key:value
        context.currentLine++;

        if (valuePart === '') {
          // Nested object
          result[keyPart] = this.parseValue(context, indent + 1);
        } else {
          // Primitive or inline array
          result[keyPart] = this.parsePrimitive(valuePart, context);
        }
      }
    }

    // If result is empty, return null
    if (Object.keys(result).length === 0) {
      return null;
    }

    // If result has only one key and it's a dash (array item), return the value
    if (Object.keys(result).length === 1 && result['-']) {
      return result['-'];
    }

    return result;
  }

  /**
   * Parse tabular array
   */
  private parseTabularArray(
    context: ParseContext,
    count: number,
    fieldsStr: string,
    delimiter: string,
    _baseIndent: number
  ): JsonArray {
    const fields = fieldsStr.split(',');
    const result: JsonArray = [];

    // Parse data rows
    for (let i = 0; i < count; i++) {
      if (context.currentLine >= context.lines.length) {
        if (context.options.validate) {
          throw new CTFValidationError(
            `Expected ${count} rows, but only found ${i}`
          );
        }
        break;
      }

      const line = context.lines[context.currentLine];
      const trimmed = line.trim();

      if (trimmed === '') {
        if (context.options.strict) {
          throw new CTFParseError(
            `Expected data row ${i + 1} of ${count}`,
            context.currentLine + 1
          );
        }
        context.currentLine++;
        i--;
        continue;
      }

      const values = this.splitByDelimiter(trimmed, delimiter);

      if (values.length !== fields.length) {
        if (context.options.strict) {
          throw new CTFParseError(
            `Expected ${fields.length} values, got ${values.length}`,
            context.currentLine + 1
          );
        }
      }

      const obj: JsonObject = {};
      for (let j = 0; j < fields.length; j++) {
        obj[fields[j]] = this.parsePrimitive(values[j] || '', context);
      }

      result.push(obj);
      context.currentLine++;
    }

    return result;
  }

  /**
   * Parse columnar array
   */
  private parseColumnarArray(
    context: ParseContext,
    count: number,
    fieldsStr: string,
    _baseIndent: number
  ): JsonArray {
    const fields = fieldsStr.split(',');
    const columns: Map<string, JsonValue[]> = new Map();

    // Parse each column
    while (context.currentLine < context.lines.length) {
      const line = context.lines[context.currentLine];

      if (line.trim() === '') {
        context.currentLine++;
        continue;
      }

      const indent = this.getIndentLevel(line);
      if (indent <= _baseIndent) {
        break;
      }

      const trimmed = line.trim();

      // Check for column definition: |field:data
      const colMatch = trimmed.match(/^\|(.+?):(.+)$/);
      if (!colMatch) {
        break;
      }

      const field = colMatch[1];
      const data = colMatch[2];

      columns.set(field, this.parseColumnData(data, count, context));
      context.currentLine++;
    }

    // Reconstruct objects
    const result: JsonArray = [];
    for (let i = 0; i < count; i++) {
      const obj: JsonObject = {};
      for (const field of fields) {
        const colData = columns.get(field);
        if (colData && colData[i] !== undefined) {
          obj[field] = colData[i];
        }
      }
      result.push(obj);
    }

    return result;
  }

  /**
   * Parse column data (with range or RLE support)
   */
  private parseColumnData(data: string, _count: number, context: ParseContext): JsonValue[] {
    // Check for range: [1..100]
    const rangeMatch = data.match(/^\[(\d+)\.\.(\d+)\]$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      const result: number[] = [];
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
      return result;
    }

    // Check for RLE: ["value"=count,...]
    const rleMatch = data.match(/^\[(.+)\]$/);
    if (rleMatch) {
      const content = rleMatch[1];
      const parts = content.split(',');

      // Try to parse as RLE
      if (content.includes('=')) {
        const result: JsonValue[] = [];

        for (const part of parts) {
          const eqMatch = part.match(/"(.+?)"=(\d+)/);
          if (eqMatch) {
            const value = eqMatch[1];
            const rleCount = parseInt(eqMatch[2], 10);

            for (let i = 0; i < rleCount; i++) {
              result.push(this.parsePrimitive(value, context));
            }
          }
        }

        return result;
      }

      // Regular array
      return parts.map((p: string) => this.parsePrimitive(p.trim(), context));
    }

    // Fallback: single value
    return [this.parsePrimitive(data, context)];
  }

  /**
   * Parse primitive value
   */
  private parsePrimitive(value: string, context: ParseContext): JsonValue {
    value = value.trim();

    // Null
    if (value === '_') return null;

    // Boolean
    if (value === '+') return true;
    if (value === '-') return false;

    // Reference
    if (value.startsWith('^')) {
      const refId = parseInt(value.substring(1), 10);
      const refValue = context.references.get(refId);

      if (refValue === undefined) {
        throw new CTFParseError(`Undefined reference: ^${refId}`);
      }

      return refValue;
    }

    // Inline array: [a b c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const content = value.slice(1, -1).trim();
      if (content === '') return [];

      return content.split(/\s+/).map((v) => this.parsePrimitive(v, context));
    }

    // String (quoted)
    if (value.startsWith('"') && value.endsWith('"')) {
      return unescapeString(value);
    }

    // Number
    const num = Number(value);
    if (!isNaN(num) && value !== '') {
      return num;
    }

    // String (unquoted)
    return value;
  }

  /**
   * Get indentation level of a line
   */
  private getIndentLevel(line: string): number {
    let indent = 0;
    for (const char of line) {
      if (char === ' ') {
        indent++;
      } else if (char === '\t') {
        indent += 2; // Assume tab = 2 spaces
      } else {
        break;
      }
    }
    return indent;
  }

  /**
   * Split string by delimiter, respecting quotes
   */
  private splitByDelimiter(str: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        current += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        current += char;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
        continue;
      }

      if (!inQuotes && char === delimiter) {
        result.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    if (current !== '') {
      result.push(current);
    }

    return result;
  }
}

/**
 * Convenience function to decode CTF to JSON
 */
export function decode(input: string, options?: DecodeOptions): JsonValue {
  const decoder = new CTFDecoder(options);
  return decoder.decode(input);
}
