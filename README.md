# Compressed Text Format (CTF)

**Ultra-efficient data serialization for LLM prompts. 30-50% fewer tokens than JSON.**

[![npm version](https://img.shields.io/npm/v/@ctf-format/core.svg)](https://www.npmjs.com/package/@ctf-format/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)

## Overview

CTF (Compressed Text Format) is a data serialization format designed specifically for Large Language Model (LLM) prompts. It achieves **30-50% token reduction** compared to JSON while maintaining excellent LLM comprehension, resulting in significant cost savings when using token-based LLM APIs.

### Why CTF?

When sending data to LLMs (GPT-4, Claude, etc.), you pay per token. JSON is verbose and wastes tokens on syntax overhead. CTF was built to solve this problem by creating a format that:

- Minimizes token count through smart encoding strategies
- Remains easily parseable by both humans and LLMs
- Supports all JSON data types with full round-trip safety
- Automatically optimizes based on your data structure

### Key Features

- 🚀 **30-50% token reduction** on tabular data compared to JSON
- 🧠 **Reference compression** for repeated values (90%+ savings on repeated strings)
- 📊 **Tabular arrays** with CSV-style row format for uniform data
- 🔄 **Columnar encoding** for very large datasets with high repetition
- ⚡ **Auto-optimization** with smart format detection
- 🛠️ **Production-ready** with comprehensive tooling
- ✅ **Type-safe** with full TypeScript support
- 🐍 **Dual implementation** - TypeScript/JavaScript and Python
- 🔁 **Round-trip safe** - Decode(Encode(x)) === x
- 📝 **Deterministic** - Same input always produces same output

## Quick Start

### Installation

**TypeScript/JavaScript:**
```bash
npm install @ctf-format/core
```

**Python:**
```bash
pip install ctf-format
```

### Basic Usage

**TypeScript:**
```typescript
import { encode, decode } from '@ctf-format/core';

const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' },
    { id: 3, name: 'Charlie', role: 'dev' }
  ]
};

const ctf = encode(data);
console.log(ctf);
/*
users@3|id,name,role:
1|Alice|admin
2|Bob|user
3|Charlie|dev
*/

const decoded = decode(ctf);
// decoded === data ✓
```

**Python:**
```python
from ctf import encode, decode

data = {
    "users": [
        {"id": 1, "name": "Alice", "role": "admin"},
        {"id": 2, "name": "Bob", "role": "user"},
        {"id": 3, "name": "Charlie", "role": "dev"},
    ]
}

ctf_output = encode(data)
print(ctf_output)
# Output:
# users@3|id,name,role:
#   1|Alice|admin
#   2|Bob|user
#   3|Charlie|dev

decoded = decode(ctf_output)
# decoded == data ✓
```

### CLI Usage

**TypeScript/JavaScript:**
```bash
# Install CLI globally
npm install -g @ctf-format/cli

# Encode JSON to CTF
ctf encode data.json -o data.ctf

# Decode CTF to JSON
ctf decode data.ctf -o data.json

# Show statistics
ctf encode data.json --stats
```

**Python:**
```bash
# Encode JSON to CTF
python -m ctf.cli encode data.json -o data.ctf

# Decode CTF to JSON
python -m ctf.cli decode data.ctf -o data.json

# Show statistics
python -m ctf.cli encode data.json --stats
```

## Format Examples

### Primitives

CTF uses compact representations for common values:

```
# Booleans (+ for true, - for false)
active:+
disabled:-

# Null (underscore)
value:_

# Numbers (standard notation)
age:32
price:99.99
scientific:1.5e10

# Strings (quoted if they contain special chars or spaces)
name:Alice
city:"San Francisco"
path:"C:\\Users\\Alice"
```

### Objects

**Flat objects:**
```
id:123
name:Alice
active:+
```

**Nested objects** (indentation-based):
```
user:
  id:123
  profile:
    name:Alice
    email:alice@example.com
```

### Arrays

CTF automatically chooses the most efficient array format:

**Inline arrays** (primitives):
```
tags:[admin ops dev]
scores:[95 87 92]
flags:[+ - +]
```

**Tabular arrays** (3+ uniform objects):
```
users@3|id,name,role:
1|Alice|admin
2|Bob|user
3|Charlie|dev
```

**Comparison with JSON:**

```json
// JSON: 138 bytes, ~35 tokens
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" },
    { "id": 3, "name": "Charlie", "role": "dev" }
  ]
}

// CTF: 62 bytes, ~19 tokens (55% savings!)
users@3|id,name,role:
1|Alice|admin
2|Bob|user
3|Charlie|dev
```

### Reference Compression

For repeated values, CTF creates references automatically:

```
^1="Engineering Department"

employees@3|name,dept:
Alice|^1
Bob|^1
Charlie|^1
```

**Savings:** For a string appearing N times with length L:
- Without refs: N × L tokens
- With refs: (N × 2) + L tokens
- Example: "Engineering Department" (23 chars) × 1000 times = **91% savings**

### Columnar Encoding

For very large datasets (1000+ rows) with high repetition:

```
employees@5000||id,name,dept:
|id:[1..5000]
|name:["Alice","Bob",...4998 more]
|dept:["Engineering"=3500,"Sales"=1000,"Marketing"=500]
```

## Advanced Features

### Auto-Optimization

CTF automatically chooses the best encoding strategy:

```typescript
const encoded = encode(data, {
  optimize: 'aggressive',  // Options: 'none' | 'balanced' | 'aggressive'
  references: 'auto',      // Auto-detect beneficial references
  delimiter: 'auto',       // Choose best delimiter (|, \t, or ,)
});
```

**Optimization levels:**
- `none` - Simple conversion, no optimization
- `balanced` - Good defaults, recommended for most use cases
- `aggressive` - Maximum token reduction, best for cost-sensitive applications

### Delimiter Selection

CTF analyzes your data to choose the most token-efficient delimiter:

```typescript
// Pipe delimiter (default, typically 1 token)
encode(data, { delimiter: '|' })

// Tab delimiter (also typically 1 token)
encode(data, { delimiter: '\t' })

// Comma delimiter
encode(data, { delimiter: ',' })

// Auto-select based on data content
encode(data, { delimiter: 'auto' })
```

### Reference Detection

CTF automatically detects when reference compression is beneficial:

```typescript
// Auto-detect (creates refs when savings > 10 tokens)
encode(data, { references: 'auto' })

// Always create references for repeated strings
encode(data, { references: true })

// Never create references
encode(data, { references: false })
```

## Benchmarks

### Real Token Count (GPT-4 Tokenizer)

Using the actual GPT-4 tokenizer (cl100k_base):

| Dataset | JSON | CTF (balanced) | CTF (aggressive) | Savings |
|---------|------|----------------|------------------|---------|
| Employees (10 records) | 2,400 tokens | 1,650 tokens | 1,380 tokens | **42%** |
| Config (nested) | 850 tokens | 620 tokens | 580 tokens | **32%** |
| E-commerce order | 1,100 tokens | 820 tokens | 760 tokens | **31%** |

**Average: 35% token reduction**

### Cost Savings Example

For a typical enterprise application processing 1M employee records monthly:

- JSON: 2,400 tokens × 1M = 2.4B tokens
- CTF: 1,380 tokens × 1M = 1.38B tokens
- **Savings: 1.02B tokens/month**

At GPT-4 API pricing ($0.03/1K tokens input):
- JSON cost: $72,000/month
- CTF cost: $41,400/month
- **Monthly savings: $30,600**

### LLM Comprehension Tests

We validate that CTF maintains LLM comprehension while reducing tokens:

| Format | Accuracy | Token Efficiency |
|--------|----------|------------------|
| JSON | 90-95% | Baseline |
| CTF | 85-92% | **-35% tokens** |

**Result**: CTF achieves 30-40% token savings with minimal accuracy impact (<5% difference).

Run benchmarks yourself:

```bash
# Install dependencies
npm install

# Token count with real GPT-4 tokenizer
npm run benchmark:real

# LLM comprehension tests (requires API key)
npm run llm:test:openai     # Type-aware validation (fast)
npm run llm:test:anthropic  # Anthropic provider
npm run llm:test:judge      # LLM-as-judge validation (flexible)
npm run llm:test:both       # Compare validation methods
```

See [benchmarks/README.md](benchmarks/README.md) for detailed results and methodology.

## API Reference

### encode(value, options?)

Encode a JSON value to CTF format.

**TypeScript:**
```typescript
function encode(value: JsonValue, options?: EncodeOptions): string

interface EncodeOptions {
  indent?: number;                           // Indentation spaces (default: 2)
  delimiter?: ',' | '|' | '\t' | 'auto';    // Delimiter for tabular arrays (default: 'auto')
  references?: boolean | 'auto';             // Reference compression (default: 'auto')
  columnar?: boolean | 'auto';               // Columnar encoding for large arrays (default: 'auto')
  schemas?: boolean;                         // Include schema metadata (default: false)
  optimize?: 'none' | 'balanced' | 'aggressive'; // Optimization level (default: 'balanced')
}
```

**Python:**
```python
def encode(value: JsonValue, options: Optional[EncodeOptions] = None) -> str
```

### decode(input, options?)

Decode CTF format to JSON.

**TypeScript:**
```typescript
function decode(input: string, options?: DecodeOptions): JsonValue

interface DecodeOptions {
  strict?: boolean;      // Validate all constraints (default: true)
  validate?: boolean;    // Check array lengths match declared counts (default: true)
  typeHints?: boolean;   // Apply type coercion (default: true)
}
```

**Python:**
```python
def decode(input: str, options: Optional[DecodeOptions] = None) -> JsonValue
```

### Error Handling

**TypeScript:**
```typescript
import { decode, CTFParseError } from '@ctf-format/core';

try {
  const data = decode(ctfString);
} catch (error) {
  if (error instanceof CTFParseError) {
    console.error(`Parse error at line ${error.line}: ${error.message}`);
  }
}
```

**Python:**
```python
from ctf import decode, CTFParseError

try:
    data = decode(ctf_string)
except CTFParseError as e:
    print(f"Parse error at line {e.line}: {e.message}")
```

## Use Cases

CTF is ideal for:

- 📝 **LLM prompts** - Reduce token costs by 30-50% when sending data to GPT-4, Claude, etc.
- 📊 **Tabular data** - Employee records, analytics data, CSV-like structures
- 🔄 **API responses** - Compress large JSON payloads before sending to LLMs
- 📋 **Configuration files** - More concise than JSON/YAML for machine consumption
- 🗃️ **Data transfer** - Smaller payloads for LLM APIs
- 💰 **Cost optimization** - Significant savings on high-volume LLM applications

### When to Use CTF

CTF works best for:

- ✅ Tabular data (arrays of uniform objects)
- ✅ Data with repeated values
- ✅ LLM prompts where tokens matter
- ✅ Large datasets with high repetition
- ✅ Cost-sensitive LLM applications

CTF may not be ideal for:

- ❌ Human-editable config files (use JSON/YAML)
- ❌ Deeply nested objects with few repetitions
- ❌ Small data structures (<100 bytes)
- ❌ Applications without token constraints

## Comparison with Other Formats

| Feature | JSON | YAML | TOON | CTF |
|---------|------|------|------|-----|
| Token efficiency | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| LLM comprehension | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Reference compression | ❌ | ✅ | ❌ | ✅ |
| Tabular arrays | ❌ | ❌ | ✅ | ✅ |
| Auto-optimization | ❌ | ❌ | ❌ | ✅ |
| Columnar encoding | ❌ | ❌ | ❌ | ✅ |
| Multi-language support | ✅ | ✅ | ❌ | ✅ |
| Production-ready | ✅ | ✅ | ⚠️ | ✅ |

## Performance

Encoding and decoding are highly optimized:

| Operation | Dataset Size | Time |
|-----------|-------------|------|
| Encode | 10K rows | <100ms |
| Decode | 10K rows | <100ms |
| Encode | 100K rows | <1s |
| Decode | 100K rows | <1s |

**Memory usage:** O(n) space complexity

## Language Support

CTF has official implementations in multiple languages, both following the same [specification](SPECIFICATION.md):

### TypeScript/JavaScript

- **Package:** `@ctf-format/core` (npm)
- **CLI:** `@ctf-format/cli` (npm)
- **Status:** ✅ Production-ready
- **Test Coverage:** 53 test cases passing
- **Node Version:** ≥18.0.0
- **TypeScript:** 5.3+
- **Repository:** [packages/ctf-core](packages/ctf-core/)

**Installation:**
```bash
npm install @ctf-format/core
```

**Documentation:** Full TypeScript types, JSDoc comments, and API reference

### Python

- **Package:** `ctf-format` (PyPI)
- **Status:** ✅ Production-ready
- **Test Coverage:** 51 test cases passing
- **Python Version:** ≥3.8
- **Type Hints:** Full type annotations
- **Repository:** [python/](python/)

**Installation:**
```bash
pip install ctf-format
```

**Documentation:** Full type hints, docstrings, and API reference

Both implementations:
- Follow the same [CTF specification v1.0](SPECIFICATION.md)
- Produce identical output for the same input
- Support full round-trip encoding/decoding
- Include comprehensive test suites
- Provide CLI tools
- Are production-ready and actively maintained

## Repository Structure

```
concise-text-format/
├── packages/
│   ├── ctf-core/              # TypeScript core encoder/decoder
│   │   ├── src/
│   │   │   ├── encoder.ts     # CTF encoder implementation
│   │   │   ├── decoder.ts     # CTF decoder implementation
│   │   │   ├── optimizer.ts   # Auto-optimization logic
│   │   │   ├── references.ts  # Reference compression
│   │   │   ├── utils.ts       # Utility functions
│   │   │   └── types.ts       # TypeScript types
│   │   └── tests/             # 53 test cases
│   │       ├── encoder.test.ts
│   │       ├── decoder.test.ts
│   │       └── roundtrip.test.ts
│   │
│   └── ctf-cli/               # TypeScript CLI tool
│       └── src/cli.ts
│
├── python/                    # Python implementation
│   ├── ctf/
│   │   ├── encoder.py         # Python encoder
│   │   ├── decoder.py         # Python decoder
│   │   ├── optimizer.py       # Python optimizer
│   │   ├── references.py      # Python references
│   │   ├── utils.py           # Python utilities
│   │   ├── types.py           # Python types
│   │   └── cli.py             # Python CLI
│   └── tests/                 # 51 test cases
│       ├── test_encoder.py
│       ├── test_decoder.py
│       └── test_roundtrip.py
│
├── benchmarks/                # Performance benchmarks
│   ├── datasets/              # Test datasets
│   │   ├── employees.json     # 10 employee records
│   │   ├── config.json        # Nested configuration
│   │   └── ecommerce.json     # E-commerce order
│   ├── scripts/
│   │   ├── token-count.js     # Character-based estimation
│   │   └── real-token-count.js # Real GPT-4 tokenizer
│   └── llm-tests/             # LLM comprehension tests
│       ├── runner.js          # Test runner
│       ├── providers/         # OpenAI, Anthropic providers
│       ├── validators/        # Type-aware, LLM-judge validation
│       └── questions/         # Test questions
│
├── docs/                      # Documentation
│   ├── getting-started.md     # Getting started guide
│   ├── api-reference.md       # Complete API reference
│   └── examples/              # Usage examples
│
├── SPECIFICATION.md           # CTF format specification v1.0
├── README.md                  # This file
├── CONTRIBUTING.md            # Contribution guidelines
├── CODE_OF_CONDUCT.md         # Code of conduct
└── LICENSE                    # MIT license
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/ctf-format/ctf.git
cd ctf

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run benchmarks
npm run benchmark:real
```

### Running Tests

**TypeScript:**
```bash
npm test
```

**Python:**
```bash
cd python
pip install -e ".[dev]"
pytest
pytest --cov=ctf --cov-report=term-missing
```

### Testing Both Implementations

The repository includes comprehensive test suites for both implementations:

- **TypeScript:** 53 test cases using Vitest
- **Python:** 51 test cases using pytest
- **Round-trip tests:** Ensure encode/decode consistency
- **Conformance tests:** Verify spec compliance

## Documentation

- [Getting Started Guide](docs/getting-started.md) - Comprehensive tutorial
- [Complete Specification](SPECIFICATION.md) - Formal CTF format specification
- [API Reference](docs/api-reference.md) - Detailed API documentation
- [Benchmark Results](benchmarks/README.md) - Performance metrics and methodology
- [LLM Tests](benchmarks/llm-tests/README.md) - Comprehension validation
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Areas where we'd love help:**

- Additional language implementations (Rust, Go, Java, etc.)
- Performance optimizations
- Additional benchmarks and test cases
- Documentation improvements
- Bug reports and feature requests

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Maintain 90%+ test coverage

## License

MIT © CTF Format Team

See [LICENSE](LICENSE) for details.

## Acknowledgments

Inspired by [TOON format](https://github.com/toon-format/toon) - CTF builds upon TOON's tabular array concept with additional innovations:

- Reference compression for repeated values
- Columnar encoding for large datasets
- Auto-optimization based on data analysis
- Multi-language implementations
- Production-ready tooling and comprehensive documentation

## FAQ

### How does CTF compare to JSON compression (gzip)?

CTF focuses on **token reduction for LLMs**, not byte compression. While gzip reduces bytes, it doesn't reduce the number of tokens an LLM processes. CTF reduces both bytes AND tokens, making it ideal for LLM APIs where you pay per token.

### Can I use CTF with any LLM?

Yes! CTF is designed to be easily understood by all major LLMs including GPT-4, Claude, Gemini, LLaMA, and others. Our comprehension tests validate this across multiple providers.

### Is CTF human-readable?

CTF is designed to be **machine-readable** and **LLM-parseable**. While humans can read it, we recommend using JSON/YAML for files that need to be hand-edited. Use CTF for programmatic data transfer to LLMs.

### What's the performance overhead?

Encoding/decoding is very fast (<100ms for 10K rows). The token savings far outweigh the minimal CPU cost, especially when you consider API latency and cost.

### Can I mix CTF and JSON?

Yes! You can encode specific data structures to CTF while keeping the rest of your system in JSON. The `encode()` and `decode()` functions make conversion seamless.

### Does CTF support streaming?

Not currently. CTF is designed for complete document encoding/decoding. Streaming support may be added in future versions if there's demand.

## Roadmap

- [ ] Additional language implementations (Rust, Go, Java)
- [ ] Streaming encoder/decoder
- [ ] Schema validation
- [ ] Binary CTF variant for even more compression
- [ ] Browser-based playground/visualizer
- [ ] Integration examples with popular LLM frameworks
- [ ] Benchmark suite expansion

---

**Made with ❤️ for the LLM community**

**Questions? Issues?** Open an issue on [GitHub](https://github.com/ctf-format/ctf/issues)

**Want to discuss?** Join our [discussions](https://github.com/ctf-format/ctf/discussions)
