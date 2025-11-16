/**
 * Core type definitions for CTF format
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export type Delimiter = ',' | '|' | '\t' | 'auto';
export type OptimizeLevel = 'none' | 'balanced' | 'aggressive';

/**
 * Encoder options
 */
export interface EncodeOptions {
  /** Number of spaces for indentation (default: 2) */
  indent?: number;

  /** Delimiter for tabular arrays (default: 'auto') */
  delimiter?: Delimiter;

  /** Enable reference compression (default: 'auto') */
  references?: boolean | 'auto';

  /** Enable columnar encoding for large datasets (default: 'auto') */
  columnar?: boolean | 'auto';

  /** Enable schema shortcuts (default: false) */
  schemas?: boolean;

  /** Optimization level (default: 'balanced') */
  optimize?: OptimizeLevel;
}

/**
 * Decoder options
 */
export interface DecodeOptions {
  /** Strict validation mode (default: true) */
  strict?: boolean;

  /** Validate array lengths (default: true) */
  validate?: boolean;

  /** Apply type hints (default: true) */
  typeHints?: boolean;
}

/**
 * Data analysis results
 */
export interface DataAnalysis {
  totalArrays: number;
  tabularCandidates: number;
  columnarCandidates: number;
  repeatedValues: Map<string, number>;
  estimatedTokens: number;
  delimiterFrequency: Map<string, number>;
}

/**
 * Optimization strategy recommendation
 */
export type OptimizationStrategy = 'columnar' | 'tabular-heavy' | 'balanced' | 'minimal';

/**
 * Reference table entry
 */
export interface ReferenceEntry {
  id: number;
  value: string;
  occurrences: number;
  savings: number;
}

/**
 * Parse error with location information
 */
export class CTFParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number
  ) {
    super(message);
    this.name = 'CTFParseError';
  }
}

/**
 * Validation error
 */
export class CTFValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CTFValidationError';
  }
}
