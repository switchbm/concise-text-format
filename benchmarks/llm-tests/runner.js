#!/usr/bin/env node

/**
 * LLM Comprehension Test Runner
 *
 * Tests how well LLMs understand CTF format vs JSON
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { encode as encodeCTF } from '../../packages/ctf-core/dist/index.js';
import { encode as encodeTokens } from 'gpt-tokenizer';
import { createProvider } from './providers/index.js';
import { generateQuestions, filterQuestions } from './questions/generator.js';
import { validateBatch } from './validators/type-aware.js';
import { validateBatchWithJudge, compareValidationMethods } from './validators/llm-judge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run comprehension tests on a dataset
 */
async function runDatasetTest(data, datasetName, provider, options = {}) {
  const {
    maxQuestions = 20,
    format = 'json', // 'json' or 'ctf'
    optimize = 'balanced',
    judgeMode = 'type-aware' // 'type-aware', 'llm-judge', or 'both'
  } = options;

  console.log(`\nTesting ${datasetName} with ${format.toUpperCase()} format...`);

  // Generate questions
  const allQuestions = generateQuestions(data, datasetName);
  const questions = filterQuestions(allQuestions, { limit: maxQuestions });

  console.log(`Generated ${allQuestions.length} questions, testing ${questions.length}`);

  // Format data
  let formattedData;
  if (format === 'ctf') {
    formattedData = encodeCTF(data, { optimize, references: true });
  } else {
    formattedData = JSON.stringify(data, null, 2);
  }

  // Count tokens
  const tokens = encodeTokens(formattedData).length;

  console.log(`Data size: ${formattedData.length} bytes, ${tokens} tokens`);

  // Test each question
  const results = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const progress = `[${i + 1}/${questions.length}]`;

    process.stdout.write(`${progress} Testing question: ${question.question.substring(0, 50)}...`);

    // Create prompt
    const prompt = `Here is some data in ${format === 'ctf' ? 'CTF (Compressed Text Format)' : 'JSON'} format:

${formattedData}

Question: ${question.question}

Please provide a concise answer. If the answer is a specific value, provide just that value.`;

    try {
      // Query LLM
      const response = await provider.complete(prompt, {
        temperature: 0,
        maxTokens: 500
      });

      // Estimate tokens (rough)
      const inputTokens = encodeTokens(prompt).length;
      const outputTokens = encodeTokens(response).length;
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      results.push({
        question: question.question,
        response,
        expected: question.answer,
        questionType: question.type
      });

      process.stdout.write(` ✓\n`);
    } catch (error) {
      process.stdout.write(` ✗ (${error.message})\n`);
      results.push({
        question: question.question,
        response: '',
        expected: question.answer,
        questionType: question.type,
        error: error.message
      });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Validate results based on judge mode
  let validation, judgeValidation, comparison;

  if (judgeMode === 'type-aware' || judgeMode === 'both') {
    console.log('\nValidating with type-aware method...');
    validation = validateBatch(results);
  }

  if (judgeMode === 'llm-judge' || judgeMode === 'both') {
    console.log('\nValidating with LLM-as-judge...');
    judgeValidation = await validateBatchWithJudge(results, provider);

    if (judgeMode === 'llm-judge') {
      validation = judgeValidation;
    }
  }

  if (judgeMode === 'both') {
    console.log('\nComparing validation methods...');
    comparison = compareValidationMethods(validation, judgeValidation);

    console.log(`Agreement Rate: ${(comparison.agreementRate * 100).toFixed(1)}%`);
    console.log(`Type-Aware Accuracy: ${(comparison.typeAwareAccuracy * 100).toFixed(1)}%`);
    console.log(`LLM Judge Accuracy: ${(comparison.judgeAccuracy * 100).toFixed(1)}%`);
    console.log(`LLM Judge (with partial): ${(comparison.judgeAccuracyWithPartial * 100).toFixed(1)}%`);

    if (comparison.disagreements > 0) {
      console.log(`\nDisagreements: ${comparison.disagreements}`);
    }
  }

  // Calculate total cost including judge costs
  let totalCost = provider.estimateCost(totalInputTokens, totalOutputTokens, provider.defaultModel);
  if (judgeValidation) {
    totalCost += judgeValidation.judgeCost;
  }

  return {
    dataset: datasetName,
    format,
    questions: questions.length,
    accuracy: validation.accuracy,
    confidence: validation.avgConfidence,
    correct: validation.correct,
    total: validation.total,
    dataSize: formattedData.length,
    dataTokens: tokens,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cost: totalCost,
    validations: validation.validations,
    questions: questions,
    judgeMode,
    judgeValidation,
    comparison
  };
}

/**
 * Compare CTF vs JSON comprehension
 */
async function compareFormats(data, datasetName, provider, options = {}) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Dataset: ${datasetName}`);
  console.log(`Provider: ${provider.getName()}`);
  console.log('='.repeat(70));

  // Test JSON
  const jsonResults = await runDatasetTest(data, datasetName, provider, {
    ...options,
    format: 'json'
  });

  // Test CTF
  const ctfResults = await runDatasetTest(data, datasetName, provider, {
    ...options,
    format: 'ctf'
  });

  // Print comparison
  console.log(`\n${'-'.repeat(70)}`);
  console.log(`COMPARISON (Validation: ${options.judgeMode})`);
  console.log('-'.repeat(70));

  console.log(`\nFormat          Accuracy   Confidence   Data Tokens   Cost`);
  console.log('-'.repeat(70));

  const formatRow = (results) => {
    const accuracy = (results.accuracy * 100).toFixed(1);
    const confidence = (results.confidence * 100).toFixed(1);
    const tokens = results.dataTokens;
    const cost = results.cost.toFixed(4);
    return `${results.format.toUpperCase().padEnd(15)} ${accuracy.padStart(5)}%     ${confidence.padStart(5)}%        ${String(tokens).padStart(6)}    $${cost}`;
  };

  console.log(formatRow(jsonResults));
  console.log(formatRow(ctfResults));

  // Show judge comparison if both methods used
  if (options.judgeMode === 'both' && jsonResults.comparison && ctfResults.comparison) {
    console.log(`\n${'-'.repeat(70)}`);
    console.log('VALIDATION METHOD COMPARISON');
    console.log('-'.repeat(70));
    console.log(`\nJSON Format:`);
    console.log(`  Agreement Rate: ${(jsonResults.comparison.agreementRate * 100).toFixed(1)}%`);
    console.log(`  Type-Aware: ${(jsonResults.comparison.typeAwareAccuracy * 100).toFixed(1)}%`);
    console.log(`  LLM Judge: ${(jsonResults.comparison.judgeAccuracy * 100).toFixed(1)}%`);

    console.log(`\nCTF Format:`);
    console.log(`  Agreement Rate: ${(ctfResults.comparison.agreementRate * 100).toFixed(1)}%`);
    console.log(`  Type-Aware: ${(ctfResults.comparison.typeAwareAccuracy * 100).toFixed(1)}%`);
    console.log(`  LLM Judge: ${(ctfResults.comparison.judgeAccuracy * 100).toFixed(1)}%`);
  }

  // Calculate improvements
  const tokenSavings = ((jsonResults.dataTokens - ctfResults.dataTokens) / jsonResults.dataTokens * 100).toFixed(1);
  const accuracyDiff = ((ctfResults.accuracy - jsonResults.accuracy) * 100).toFixed(1);
  const costSavings = ((jsonResults.cost - ctfResults.cost) / jsonResults.cost * 100).toFixed(1);

  console.log(`\n${'='.repeat(70)}`);
  console.log('IMPROVEMENTS (CTF vs JSON)');
  console.log('='.repeat(70));
  console.log(`Token Reduction: -${tokenSavings}%`);
  console.log(`Accuracy Change: ${accuracyDiff >= 0 ? '+' : ''}${accuracyDiff}%`);
  console.log(`Cost Savings: -${costSavings}%`);

  return {
    dataset: datasetName,
    json: jsonResults,
    ctf: ctfResults,
    improvements: {
      tokens: tokenSavings,
      accuracy: accuracyDiff,
      cost: costSavings
    }
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let providerName = null;
  let datasetFilter = null;
  let maxQuestions = null;
  let judgeMode = 'type-aware';

  // Parse flags and positional arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--judge' || arg === '-j') {
      judgeMode = 'llm-judge';
    } else if (arg === '--both' || arg === '-b') {
      judgeMode = 'both';
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
CTF LLM Comprehension Test

Usage: node runner.js [provider] [dataset] [questions] [options]

Arguments:
  provider   LLM provider (openai, anthropic) [default: openai]
  dataset    Dataset to test (config, ecommerce, employees) [default: all]
  questions  Max questions per dataset [default: 20]

Options:
  -j, --judge    Use LLM-as-judge validation (slower, more expensive)
  -b, --both     Use both type-aware and LLM-judge (compare methods)
  -h, --help     Show this help message

Validation Modes:
  type-aware     Fast, deterministic validation (default)
  llm-judge      Use LLM to judge correctness (more flexible, expensive)
  both           Run both methods and compare results

Examples:
  node runner.js openai                    # Test all datasets with OpenAI
  node runner.js anthropic config 10       # Test config with 10 questions
  node runner.js openai config 20 --judge  # Use LLM-as-judge
  node runner.js openai --both             # Compare validation methods

Environment Variables:
  OPENAI_API_KEY      OpenAI API key
  ANTHROPIC_API_KEY   Anthropic API key
`);
      process.exit(0);
    } else if (providerName === null) {
      providerName = arg;
    } else if (datasetFilter === null) {
      datasetFilter = arg;
    } else if (maxQuestions === null) {
      maxQuestions = parseInt(arg) || 20;
    }
  }

  // Set defaults
  providerName = providerName || 'openai';
  maxQuestions = maxQuestions || 20;

  console.log('CTF LLM Comprehension Test');
  console.log('='.repeat(70));
  console.log(`Provider: ${providerName}`);
  console.log(`Validation Mode: ${judgeMode}`);
  console.log(`Max questions per dataset: ${maxQuestions}`);
  console.log('='.repeat(70));

  // Create provider
  let provider;
  try {
    provider = createProvider(providerName);
    console.log(`\n✓ Provider initialized: ${provider.getName()}`);
  } catch (error) {
    console.error(`\n✗ Failed to initialize provider: ${error.message}`);
    console.log(`\nMake sure to set the appropriate API key environment variable.`);
    process.exit(1);
  }

  // Test provider
  console.log('Testing provider connection...');
  const isWorking = await provider.test();
  if (!isWorking) {
    console.error('✗ Provider test failed');
    process.exit(1);
  }
  console.log('✓ Provider is working\n');

  // Load datasets
  const datasetsDir = join(__dirname, '..', 'datasets');
  const datasetFiles = ['config.json', 'ecommerce.json', 'employees.json'];

  const datasets = {};
  for (const file of datasetFiles) {
    const name = file.replace('.json', '');

    // Apply filter if specified
    if (datasetFilter && name !== datasetFilter) {
      continue;
    }

    const path = join(datasetsDir, file);
    const content = readFileSync(path, 'utf-8');
    datasets[name] = JSON.parse(content);
  }

  console.log(`Loaded ${Object.keys(datasets).length} dataset(s): ${Object.keys(datasets).join(', ')}\n`);

  // Run tests
  const allResults = [];
  for (const [name, data] of Object.entries(datasets)) {
    const result = await compareFormats(data, name, provider, { maxQuestions, judgeMode });
    allResults.push(result);
  }

  // Print summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('SUMMARY - ALL DATASETS');
  console.log('='.repeat(70));

  let totalJsonAccuracy = 0;
  let totalCtfAccuracy = 0;
  let totalTokenSavings = 0;
  let count = 0;

  for (const result of allResults) {
    totalJsonAccuracy += result.json.accuracy;
    totalCtfAccuracy += result.ctf.accuracy;
    totalTokenSavings += parseFloat(result.improvements.tokens);
    count++;

    console.log(`\n${result.dataset}:`);
    console.log(`  JSON Accuracy: ${(result.json.accuracy * 100).toFixed(1)}%`);
    console.log(`  CTF Accuracy:  ${(result.ctf.accuracy * 100).toFixed(1)}%`);
    console.log(`  Token Savings: -${result.improvements.tokens}%`);
  }

  const avgJsonAccuracy = (totalJsonAccuracy / count * 100).toFixed(1);
  const avgCtfAccuracy = (totalCtfAccuracy / count * 100).toFixed(1);
  const avgTokenSavings = (totalTokenSavings / count).toFixed(1);

  console.log(`\n${'='.repeat(70)}`);
  console.log('AVERAGES');
  console.log('='.repeat(70));
  console.log(`JSON Accuracy:  ${avgJsonAccuracy}%`);
  console.log(`CTF Accuracy:   ${avgCtfAccuracy}%`);
  console.log(`Token Savings:  -${avgTokenSavings}%`);

  const accuracyDiff = (avgCtfAccuracy - avgJsonAccuracy).toFixed(1);
  console.log(`\nAccuracy Impact: ${accuracyDiff >= 0 ? '+' : ''}${accuracyDiff}%`);

  if (parseFloat(accuracyDiff) >= -5) {
    console.log(`\n✅ CTF maintains comprehension while saving ${avgTokenSavings}% tokens!`);
  } else {
    console.log(`\n⚠️  CTF reduces accuracy by ${Math.abs(accuracyDiff)}% (acceptable tradeoff for ${avgTokenSavings}% token savings)`);
  }
}

main().catch(console.error);
