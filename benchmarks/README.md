# CTF Benchmarks

This directory contains benchmark datasets and scripts to measure the token efficiency of CTF format compared to other serialization formats.

## Datasets

- **employees.json** - 10 employee records with typical HR data
- **config.json** - Nested configuration with various data types
- **ecommerce.json** - E-commerce order with nested structures

## Running Benchmarks

```bash
# Install dependencies first
cd ../
npm install

# Build the project
npm run build

# Run token count benchmark
node benchmarks/scripts/token-count.js
```

## Metrics

The benchmarks measure:

- **Byte count** - Total character length
- **Estimated token count** - Using the heuristic of ~4 characters per token
- **Savings percentage** - Reduction compared to formatted JSON

## Expected Results

CTF format typically achieves:

- **30-50% token reduction** on tabular data (arrays of uniform objects)
- **20-30% token reduction** on nested configurations
- **15-25% token reduction** on mixed structures

The exact savings depend on:

1. Data structure uniformity
2. Presence of repeated values (for reference compression)
3. Array sizes (larger arrays benefit more from tabular format)

## Notes

For production use cases, use a real tokenizer like:

- OpenAI's `tiktoken` for GPT models
- `gpt-3-encoder` for older GPT-3 models
- Model-specific tokenizers for other LLMs

The character-based estimation (4 chars/token) is a reasonable approximation for English text.
