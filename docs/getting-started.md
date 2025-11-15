# Getting Started with CTF

This guide will help you get started with Compressed Text Format (CTF) in your projects.

## Installation

### Node.js / TypeScript

Install the core package:

```bash
npm install @ctf-format/core
```

Or install the CLI globally:

```bash
npm install -g @ctf-format/cli
```

## Basic Usage

### Encoding Data

Convert JavaScript objects to CTF format:

```typescript
import { encode } from '@ctf-format/core';

const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' },
    { id: 3, name: 'Charlie', role: 'dev' }
  ]
};

const ctf = encode(data);
console.log(ctf);
```

Output:

```
users@3|id,name,role:
1|Alice|admin
2|Bob|user
3|Charlie|dev
```

### Decoding Data

Convert CTF format back to JavaScript objects:

```typescript
import { decode } from '@ctf-format/core';

const ctf = `users@3|id,name,role:
1|Alice|admin
2|Bob|user
3|Charlie|dev`;

const data = decode(ctf);
console.log(data);
// { users: [{ id: 1, name: 'Alice', role: 'admin' }, ...] }
```

## Encoding Options

### Optimization Levels

Control how aggressively CTF optimizes your data:

```typescript
// No optimization - simple conversion
encode(data, { optimize: 'none' })

// Balanced - good defaults (recommended)
encode(data, { optimize: 'balanced' })

// Aggressive - maximum token reduction
encode(data, { optimize: 'aggressive' })
```

### Reference Compression

Control reference compression for repeated values:

```typescript
// Auto-detect (default) - creates refs when beneficial
encode(data, { references: 'auto' })

// Always create references
encode(data, { references: true })

// Never create references
encode(data, { references: false })
```

### Delimiter Selection

Choose the delimiter for tabular arrays:

```typescript
// Auto-select based on data (default)
encode(data, { delimiter: 'auto' })

// Use pipe (typically 1 token)
encode(data, { delimiter: '|' })

// Use tab (typically 1 token)
encode(data, { delimiter: '\t' })

// Use comma
encode(data, { delimiter: ',' })
```

## Common Use Cases

### LLM Prompts

Reduce token costs when sending data to LLMs:

```typescript
import { encode } from '@ctf-format/core';

const employees = [
  { id: 1, name: 'Alice', dept: 'Engineering', salary: 95000 },
  { id: 2, name: 'Bob', dept: 'Sales', salary: 85000 },
  // ... more employees
];

const prompt = `
Here is our employee data in CTF format:

${encode({ employees }, { optimize: 'aggressive' })}

Please analyze the salary distribution.
`;

// Send to LLM API - saves 30-50% on tokens!
```

### Configuration Files

Use CTF for more concise config files:

```typescript
import { readFileSync, writeFileSync } from 'fs';
import { encode, decode } from '@ctf-format/core';

// Write config
const config = {
  database: { host: 'localhost', port: 5432 },
  cache: { enabled: true, ttl: 3600 }
};

writeFileSync('config.ctf', encode(config));

// Read config
const loadedConfig = decode(readFileSync('config.ctf', 'utf-8'));
```

### API Responses

Compress API responses before sending:

```typescript
import express from 'express';
import { encode } from '@ctf-format/core';

const app = express();

app.get('/api/users', async (req, res) => {
  const users = await db.getUsers();

  // Send as CTF format
  res.type('text/plain');
  res.send(encode({ users }));
});
```

## CLI Usage

### Encode Command

Convert JSON files to CTF:

```bash
# From file
ctf encode data.json -o data.ctf

# From stdin
cat data.json | ctf encode > data.ctf

# With statistics
ctf encode data.json --stats

# With specific delimiter
ctf encode data.json -d pipe
```

### Decode Command

Convert CTF files back to JSON:

```bash
# To file
ctf decode data.ctf -o data.json

# To stdout (pretty printed)
ctf decode data.ctf --pretty

# Without strict validation
ctf decode data.ctf --no-strict
```

### Optimize Command

Find the best encoding strategy:

```bash
# Show optimization report
ctf optimize data.json --report

# Quick check
ctf optimize data.json
```

## Best Practices

### When to Use CTF

CTF works best for:

- ✅ Tabular data (arrays of uniform objects)
- ✅ Data with repeated values
- ✅ LLM prompts where tokens matter
- ✅ Large datasets with high repetition

CTF may not be ideal for:

- ❌ Human-editable config files (use JSON/YAML)
- ❌ Deeply nested objects with few repetitions
- ❌ Small data structures (<100 bytes)

### Optimization Tips

1. **Use tabular format** - Structure data as arrays of uniform objects when possible
2. **Enable references** - For data with repeated strings
3. **Batch similar data** - Group similar objects together for better compression
4. **Use auto-optimization** - Let CTF choose the best strategy

### Error Handling

Always handle decode errors:

```typescript
import { decode, CTFParseError } from '@ctf-format/core';

try {
  const data = decode(ctfString);
} catch (error) {
  if (error instanceof CTFParseError) {
    console.error(`Parse error at line ${error.line}: ${error.message}`);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Next Steps

- Read the [complete specification](../SPECIFICATION.md)
- Check out [examples](./examples/)
- See the [API reference](./api-reference.md)
- Try the [benchmarks](../benchmarks/)

## Getting Help

- 📖 [Read the docs](../README.md)
- 🐛 [Report issues](https://github.com/ctf-format/ctf/issues)
- 💬 [Join discussions](https://github.com/ctf-format/ctf/discussions)
