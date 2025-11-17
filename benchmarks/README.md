# CTF Benchmarks

This directory contains benchmark datasets and scripts to measure the token efficiency of CTF format compared to other serialization formats.

## Datasets

- **employees.json** - 10 employee records with typical HR data
- **config.json** - Nested configuration with various data types
- **ecommerce.json** - E-commerce order with nested structures

## Running Benchmarks

### Token Count Benchmarks

```bash
# Install dependencies first
cd ../
npm install

# Build the project
npm run build

# Run character-based token count estimation
npm run benchmark

# Run REAL token count with GPT-4 tokenizer
npm run benchmark:real
```

### LLM Comprehension Tests

Test how well LLMs understand CTF vs JSON:

```bash
# Set API key (choose one)
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Run LLM comprehension tests
npm run llm:test:openai        # Test with OpenAI (type-aware validation)
npm run llm:test:anthropic     # Test with Anthropic
npm run llm:test:judge         # Test with LLM-as-judge validation
npm run llm:test:both          # Compare type-aware vs LLM-judge

# Test specific Claude 4.5 models
ANTHROPIC_API_KEY="sk-ant-..." node run-benchmark-haiku45.js
ANTHROPIC_API_KEY="sk-ant-..." node run-benchmark-sonnet45.js

# Generate questions only (no LLM calls)
npm run llm:questions
```

See [llm-tests/README.md](llm-tests/README.md) for detailed documentation.

## Metrics

The benchmarks measure:

- **Byte count** - Total character length
- **Estimated token count** - Using the heuristic of ~4 characters per token
- **Savings percentage** - Reduction compared to formatted JSON

## Results

### Claude 4.5 Models (2025-11-16)

Tested with config dataset (10 questions, 330 JSON tokens vs 216 CTF tokens):

| Model | JSON Accuracy | CTF Accuracy | Token Reduction | Accuracy Change |
|-------|---------------|--------------|-----------------|-----------------|
| **Claude 4.5 Haiku** | 100% | **100%** | **-34.5%** | **0.0%** ✓ |
| Claude Sonnet 4.5 | 100% | 80% | -34.5% | -20.0% |

**Key Finding**: Claude 4.5 Haiku maintains perfect comprehension while achieving 34.5% token savings!

### Expected Results (General)

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
