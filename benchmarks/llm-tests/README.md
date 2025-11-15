# LLM Comprehension Tests

This directory contains a pluggable framework for testing how well Large Language Models understand CTF (Compressed Text Format) compared to JSON.

## Overview

The test framework:
- **Generates questions** automatically from datasets
- **Tests multiple LLM providers** (OpenAI, Anthropic, etc.)
- **Compares comprehension** between JSON and CTF formats
- **Uses type-aware validation** for deterministic results (not LLM-as-judge)
- **Measures both accuracy and token efficiency**

## Quick Start

### Prerequisites

Set up API keys for the LLM providers you want to test:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Install Dependencies

The framework uses the existing project dependencies. Make sure the project is built:

```bash
npm install
npm run build
```

### Run Tests

Test with OpenAI (default):
```bash
node benchmarks/llm-tests/runner.js openai
```

Test with Anthropic:
```bash
node benchmarks/llm-tests/runner.js anthropic
```

Test specific dataset with limited questions:
```bash
node benchmarks/llm-tests/runner.js openai config 10
```

### Generate Questions Only

To see what questions will be asked without running LLM tests:

```bash
node benchmarks/llm-tests/generate-questions.js
```

This outputs all generated questions to `questions/generated.json`.

## Architecture

### Components

```
llm-tests/
├── providers/          # LLM provider implementations
│   ├── base.js        # Base provider interface
│   ├── openai.js      # OpenAI implementation
│   ├── anthropic.js   # Anthropic implementation
│   └── index.js       # Provider registry
├── validators/         # Response validation
│   └── type-aware.js  # Type-aware validator
├── questions/         # Question generation
│   └── generator.js   # Automatic question generator
├── runner.js          # Main test runner
└── generate-questions.js  # Question generation script
```

### Pluggable Provider System

All providers implement the `BaseLLMProvider` interface:

```javascript
import { createProvider } from './providers/index.js';

// Create provider
const provider = createProvider('openai', {
  model: 'gpt-4o-mini',
  apiKey: 'sk-...' // or set env var
});

// Test connection
await provider.test();

// Send completion
const response = await provider.complete('What is 2+2?', {
  temperature: 0,
  maxTokens: 100
});
```

### Adding New Providers

1. Create a new provider file in `providers/`:

```javascript
import { BaseLLMProvider } from './base.js';

export class MyProvider extends BaseLLMProvider {
  getName() {
    return 'MyProvider';
  }

  getApiKeyEnvVar() {
    return 'MY_PROVIDER_API_KEY';
  }

  async complete(prompt, options = {}) {
    // Implement API call
    const response = await fetch(...);
    return responseText;
  }

  estimateCost(inputTokens, outputTokens, model) {
    // Return cost in USD
    return 0.001;
  }
}
```

2. Register it in `providers/index.js`:

```javascript
import { MyProvider } from './myprovider.js';

export const PROVIDERS = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  myprovider: MyProvider, // Add here
};
```

3. Use it:

```bash
node benchmarks/llm-tests/runner.js myprovider
```

## Question Generation

The framework automatically generates questions from datasets:

- **Value questions**: "What is the value of X?"
- **Type questions**: "What type is X?"
- **Count questions**: "How many items in array X?"
- **Field questions**: "What fields does each item have?"
- **Search questions**: "Find item where field = value"

Example:

```javascript
import { generateQuestions } from './questions/generator.js';

const data = {
  users: [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 }
  ]
};

const questions = generateQuestions(data, 'mydata');
// Returns ~15-20 questions about the data structure
```

## Type-Aware Validation

Instead of using LLM-as-judge (which is slow and expensive), we use deterministic type-aware validation:

```javascript
import { validate } from './validators/type-aware.js';

const result = validate(
  'The answer is 42',  // LLM response
  42,                   // Expected answer
  { expectedType: 'number' }
);

console.log(result.correct);     // true
console.log(result.confidence);  // 1.0
console.log(result.extracted);   // 42
```

The validator:
- Extracts answers from conversational responses
- Handles JSON, quoted strings, numbers, booleans
- Performs type-aware comparison
- Supports fuzzy matching for partial credit

## Test Output

The runner provides detailed output:

```
======================================================================
Dataset: config
Provider: OpenAI
======================================================================

Testing config with JSON format...
Generated 25 questions, testing 20
Data size: 450 bytes, 120 tokens
[1/20] Testing question: What is the value of "server.po... ✓
[2/20] Testing question: What type is "server"?... ✓
...

Testing config with CTF format...
Generated 25 questions, testing 20
Data size: 290 bytes, 78 tokens
[1/20] Testing question: What is the value of "server.po... ✓
...

----------------------------------------------------------------------
COMPARISON
----------------------------------------------------------------------

Format          Accuracy   Confidence   Data Tokens   Cost
----------------------------------------------------------------------
JSON             95.0%       92.5%           120    $0.0012
CTF              90.0%       88.0%            78    $0.0008

======================================================================
IMPROVEMENTS (CTF vs JSON)
======================================================================
Token Reduction: -35.0%
Accuracy Change: -5.0%
Cost Savings: -33.3%
```

## Configuration

### Test Parameters

Edit `runner.js` to adjust:

```javascript
const options = {
  maxQuestions: 20,        // Questions per dataset
  optimize: 'balanced',    // CTF optimization level
  temperature: 0,          // LLM temperature
  maxTokens: 500          // Max response length
};
```

### Provider Models

Configure default models in provider files:

```javascript
// providers/openai.js
this.defaultModel = 'gpt-4o-mini';  // Fast and cheap

// providers/anthropic.js
this.defaultModel = 'claude-3-5-haiku-20241022';  // Fast
```

## Interpreting Results

### Success Criteria

CTF is successful if:
- **Token reduction**: 30-40% fewer tokens than JSON
- **Accuracy**: Within 5% of JSON accuracy
- **Cost**: Lower overall cost (tokens × price)

### Typical Results

Expected performance:
- **JSON Accuracy**: 90-95% (LLMs are very good at JSON)
- **CTF Accuracy**: 85-92% (slightly lower due to format unfamiliarity)
- **Token Savings**: 30-40% (as designed)
- **Cost Savings**: 30-40% (proportional to tokens)

### Failure Analysis

If accuracy is too low (<80%):
- Check which question types fail most
- Inspect `validations` array in results
- Consider adding format explanation to prompts
- Test with different optimization levels

## Best Practices

1. **Start small**: Test with 10-20 questions first
2. **Use cheap models**: Test with gpt-4o-mini or claude-haiku
3. **Compare multiple providers**: Different LLMs may handle CTF differently
4. **Review questions**: Use `generate-questions.js` to inspect questions
5. **Rate limiting**: The runner includes 100ms delays between requests

## Cost Estimation

Typical costs (with gpt-4o-mini):
- **Per question**: ~$0.0001-0.0003
- **Per dataset** (20 questions, both formats): ~$0.008
- **Full suite** (3 datasets): ~$0.024

With claude-3-5-haiku:
- **Per question**: ~$0.00008-0.0002
- **Full suite**: ~$0.018

## Troubleshooting

### "API key required" error

Set the environment variable:
```bash
export OPENAI_API_KEY="sk-..."
```

### Rate limiting errors

Increase delay in `runner.js`:
```javascript
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
```

### Low accuracy

1. Check if LLM understands format:
   - Add format explanation to prompts
   - Use more capable model

2. Review failed questions:
   - Inspect `result.validations` array
   - Check if validation is too strict

3. Adjust validation:
   - Lower `fuzzyThreshold`
   - Disable `strict` mode

## Future Enhancements

Planned improvements:
- [ ] Google Gemini provider
- [ ] XAI Grok provider
- [ ] Custom question sets
- [ ] Visualization dashboard
- [ ] Batch processing for cost efficiency
- [ ] Caching to avoid re-testing
- [ ] Confidence calibration
- [ ] Error analysis reports

## Contributing

To add features:

1. **New provider**: Add to `providers/`
2. **New validation**: Extend `validators/type-aware.js`
3. **New questions**: Modify `questions/generator.js`
4. **New metrics**: Extend result objects in `runner.js`

Keep the system modular and follow the existing patterns!
