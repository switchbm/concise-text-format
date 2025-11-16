/**
 * CTF Format - Compressed Text Format
 * Ultra-efficient data serialization for LLM prompts
 */

export { encode, CTFEncoder } from './encoder.js';
export { decode, CTFDecoder } from './decoder.js';
export { ReferenceManager } from './references.js';
export { Optimizer } from './optimizer.js';

export type {
  JsonValue,
  JsonObject,
  JsonArray,
  JsonPrimitive,
  EncodeOptions,
  DecodeOptions,
  Delimiter,
  OptimizeLevel,
  DataAnalysis,
  OptimizationStrategy,
  ReferenceEntry,
} from './types.js';

export { CTFParseError, CTFValidationError } from './types.js';

/**
 * Current version
 */
export const VERSION = '1.0.0';
