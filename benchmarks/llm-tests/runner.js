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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run comprehension tests on a dataset
 */
async function runDatasetTest(data, datasetName, provider, options = {}) {
  const {
    maxQuestions = 20,
    format = 'json', // 'json' or 'ctf'
    optimize = 'balanced'
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
        response,
        expected: question.answer,
        questionType: question.type
      });

      process.stdout.write(` ✓\n`);
    } catch (error) {
      process.stdout.write(` ✗ (${error.message})\n`);
      results.push({
        response: '',
        expected: question.answer,
        questionType: question.type,
        error: error.message
      });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Validate results
  const validation = validateBatch(results);

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
    cost: provider.estimateCost(totalInputTokens, totalOutputTokens, provider.defaultModel),
    validations: validation.validations,
    questions: questions
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
  console.log('COMPARISON');
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
  const providerName = args[0] || 'openai';
  const datasetFilter = args[1];
  const maxQuestions = parseInt(args[2]) || 20;

  console.log('CTF LLM Comprehension Test');
  console.log('='.repeat(70));
  console.log(`Provider: ${providerName}`);
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
    const result = await compareFormats(data, name, provider, { maxQuestions });
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
