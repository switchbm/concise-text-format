# API Reference

Complete API documentation for CTF format.

## Core Functions

### encode()

Encode a JSON value to CTF format.

```typescript
function encode(value: JsonValue, options?: EncodeOptions): string
```

#### Parameters

- `value: JsonValue` - The data to encode (any JSON-serializable value)
- `options?: EncodeOptions` - Optional encoding options

#### Returns

`string` - The CTF-formatted string

#### Example

```typescript
import { encode } from '@ctf-format/core';

const data = { name: 'Alice', age: 30 };
const ctf = encode(data);
// "name:Alice\nage:30"
```

---

### decode()

Decode CTF format to JSON.

```typescript
function decode(input: string, options?: DecodeOptions): JsonValue
```

#### Parameters

- `input: string` - The CTF-formatted string
- `options?: DecodeOptions` - Optional decoding options

#### Returns

`JsonValue` - The decoded JavaScript value

#### Throws

- `CTFParseError` - If the input is invalid
- `CTFValidationError` - If validation fails (in strict mode)

#### Example

```typescript
import { decode } from '@ctf-format/core';

const ctf = 'name:Alice\nage:30';
const data = decode(ctf);
// { name: 'Alice', age: 30 }
```

## Types

### JsonValue

Any JSON-serializable value:

```typescript
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
```

### EncodeOptions

Options for encoding:

```typescript
interface EncodeOptions {
  /** Number of spaces for indentation (default: 2) */
  indent?: number;

  /** Delimiter for tabular arrays (default: 'auto') */
  delimiter?: ',' | '|' | '\t' | 'auto';

  /** Enable reference compression (default: 'auto') */
  references?: boolean | 'auto';

  /** Enable columnar encoding (default: 'auto') */
  columnar?: boolean | 'auto';

  /** Enable schema shortcuts (default: false) */
  schemas?: boolean;

  /** Optimization level (default: 'balanced') */
  optimize?: 'none' | 'balanced' | 'aggressive';
}
```

#### Option Details

**indent**
- Controls indentation level for nested objects
- Default: `2` spaces
- Range: 0-8

**delimiter**
- Controls which delimiter to use in tabular arrays
- `'auto'` - Analyzes data and chooses least-used delimiter
- `'|'` - Pipe (typically 1 token)
- `'\t'` - Tab (typically 1 token)
- `','` - Comma (typically 1 token)
- Default: `'auto'`

**references**
- Controls reference compression for repeated strings
- `true` - Always create references for repeated values
- `false` - Never create references
- `'auto'` - Create references when token savings > 10
- Default: `'auto'`

**columnar**
- Controls columnar encoding for large datasets
- `true` - Use columnar format when beneficial
- `false` - Never use columnar format
- `'auto'` - Use columnar for arrays with 1000+ rows and >30% repetition
- Default: `'auto'`

**schemas**
- Controls schema shortcut feature (future)
- Default: `false`

**optimize**
- Controls overall optimization strategy
- `'none'` - Minimal optimization, simple conversion
- `'balanced'` - Good defaults, recommended for most use cases
- `'aggressive'` - Maximum token reduction, may be slower
- Default: `'balanced'`

### DecodeOptions

Options for decoding:

```typescript
interface DecodeOptions {
  /** Strict validation mode (default: true) */
  strict?: boolean;

  /** Validate array lengths (default: true) */
  validate?: boolean;

  /** Apply type hints (default: true) */
  typeHints?: boolean;
}
```

#### Option Details

**strict**
- Enable strict parsing and validation
- When `true`, throws errors on any inconsistency
- When `false`, attempts to recover from errors
- Default: `true`

**validate**
- Validate array lengths match declared counts
- Only applies when `strict` is `true`
- Default: `true`

**typeHints**
- Apply type coercion (string "42" → number 42)
- Recommended to keep enabled
- Default: `true`

## Classes

### CTFEncoder

Low-level encoder class for advanced use cases.

```typescript
class CTFEncoder {
  constructor(options?: EncodeOptions);
  encode(value: JsonValue): string;
  getStats(originalJson: string, encoded: string): EncodingStats;
}
```

#### Example

```typescript
import { CTFEncoder } from '@ctf-format/core';

const encoder = new CTFEncoder({ optimize: 'aggressive' });
const ctf = encoder.encode(data);

const stats = encoder.getStats(JSON.stringify(data), ctf);
console.log(`Saved ${stats.bytesSaved} bytes (${stats.compressionRatio})`);
```

---

### CTFDecoder

Low-level decoder class for advanced use cases.

```typescript
class CTFDecoder {
  constructor(options?: DecodeOptions);
  decode(input: string): JsonValue;
}
```

#### Example

```typescript
import { CTFDecoder } from '@ctf-format/core';

const decoder = new CTFDecoder({ strict: false });
const data = decoder.decode(ctfString);
```

---

### ReferenceManager

Manages reference compression.

```typescript
class ReferenceManager {
  build(data: JsonValue, minOccurrences?: number, minLength?: number): void;
  getReference(value: string): number | undefined;
  hasReference(value: string): boolean;
  getDefinitions(): string[];
  get count(): number;
}
```

---

### Optimizer

Analyzes data and recommends optimization strategies.

```typescript
class Optimizer {
  analyze(data: JsonValue): DataAnalysis;
  recommendStrategy(analysis: DataAnalysis): OptimizationStrategy;
  chooseDelimiter(analysis: DataAnalysis): Delimiter;
}
```

#### Example

```typescript
import { Optimizer } from '@ctf-format/core';

const optimizer = new Optimizer();
const analysis = optimizer.analyze(data);

console.log(`Total arrays: ${analysis.totalArrays}`);
console.log(`Tabular candidates: ${analysis.tabularCandidates}`);
console.log(`Recommended: ${optimizer.recommendStrategy(analysis)}`);
```

## Error Classes

### CTFParseError

Thrown when parsing fails.

```typescript
class CTFParseError extends Error {
  line?: number;
  column?: number;
}
```

#### Example

```typescript
try {
  decode(invalidCTF);
} catch (error) {
  if (error instanceof CTFParseError) {
    console.error(`Parse error at line ${error.line}: ${error.message}`);
  }
}
```

---

### CTFValidationError

Thrown when validation fails.

```typescript
class CTFValidationError extends Error {}
```

## Constants

### VERSION

Current library version.

```typescript
const VERSION: string = '1.0.0';
```

## Advanced Types

### DataAnalysis

Results from data analysis:

```typescript
interface DataAnalysis {
  totalArrays: number;
  tabularCandidates: number;
  columnarCandidates: number;
  repeatedValues: Map<string, number>;
  estimatedTokens: number;
  delimiterFrequency: Map<string, number>;
}
```

### OptimizationStrategy

Recommended encoding strategy:

```typescript
type OptimizationStrategy = 'columnar' | 'tabular-heavy' | 'balanced' | 'minimal';
```

### ReferenceEntry

Information about a reference:

```typescript
interface ReferenceEntry {
  id: number;
  value: string;
  occurrences: number;
  savings: number;
}
```

## Type Guards

Utility functions for type checking:

```typescript
import { isObject, isArray, isPrimitive } from '@ctf-format/core';

if (isObject(value)) {
  // value is JsonObject
}

if (isArray(value)) {
  // value is JsonArray
}

if (isPrimitive(value)) {
  // value is string | number | boolean | null
}
```

## Migration Guide

### From JSON

```typescript
// Before
const json = JSON.stringify(data);
const parsed = JSON.parse(json);

// After
import { encode, decode } from '@ctf-format/core';

const ctf = encode(data);
const parsed = decode(ctf);
```

### From YAML

```typescript
// Before
import yaml from 'js-yaml';
const yamlStr = yaml.dump(data);
const parsed = yaml.load(yamlStr);

// After
import { encode, decode } from '@ctf-format/core';

const ctf = encode(data);
const parsed = decode(ctf);
```

## See Also

- [Getting Started Guide](./getting-started.md)
- [Complete Specification](../SPECIFICATION.md)
- [Examples](./examples/)
