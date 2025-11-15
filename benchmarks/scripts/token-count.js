#!/usr/bin/env node

/**
 * Token counting benchmark for CTF format
 * Compares token counts across JSON, YAML, and CTF formats
 */

const fs = require('fs');
const path = require('path');
const { encode } = require('../../packages/ctf-core/dist/index.js');

/**
 * Rough token estimator (approximation)
 * In practice, you would use a real tokenizer like GPT-3-encoder or tiktoken
 */
function estimateTokens(text) {
  // Simple heuristic: split on whitespace and common punctuation
  // Average 1 token ≈ 4 characters for English
  // This is a rough approximation
  const words = text.split(/[\s,:|{}[\]()]+/).filter(Boolean);
  return words.length;
}

/**
 * More accurate estimate using character count
 */
function estimateTokensByChars(text) {
  // Rule of thumb: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Run benchmark on a dataset
 */
function runBenchmark(datasetPath) {
  const datasetName = path.basename(datasetPath, '.json');
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Dataset: ${datasetName}`);
  console.log('='.repeat(60));

  // Load data
  const jsonData = fs.readFileSync(datasetPath, 'utf-8');
  const data = JSON.parse(jsonData);

  // Format in different ways
  const formats = {
    'JSON (formatted)': JSON.stringify(data, null, 2),
    'JSON (compact)': JSON.stringify(data),
    'CTF (balanced)': encode(data, { optimize: 'balanced' }),
    'CTF (aggressive)': encode(data, { optimize: 'aggressive', references: true }),
  };

  // Calculate metrics
  const results = [];
  for (const [name, content] of Object.entries(formats)) {
    const bytes = content.length;
    const tokens = estimateTokensByChars(content);

    results.push({
      name,
      bytes,
      tokens,
    });
  }

  // Find baseline (JSON formatted)
  const baseline = results[0];

  // Print results
  console.log('\nFormat                    Bytes      Tokens     Savings');
  console.log('-'.repeat(60));

  for (const result of results) {
    const byteSavings = baseline.bytes - result.bytes;
    const bytePercent = ((byteSavings / baseline.bytes) * 100).toFixed(1);
    const tokenSavings = baseline.tokens - result.tokens;
    const tokenPercent = ((tokenSavings / baseline.tokens) * 100).toFixed(1);

    const savingsStr = result === baseline
      ? '(baseline)'
      : `-${tokenPercent}%`;

    console.log(
      `${result.name.padEnd(24)} ${String(result.bytes).padStart(6)}     ` +
      `${String(result.tokens).padStart(6)}     ${savingsStr}`
    );
  }

  return results;
}

/**
 * Main
 */
function main() {
  console.log('CTF Token Count Benchmark');
  console.log('='.repeat(60));
  console.log('Comparing token efficiency across formats');
  console.log('(Note: Using character-based estimation: 1 token ≈ 4 chars)');

  const datasetsDir = path.join(__dirname, '..', 'datasets');
  const datasets = fs.readdirSync(datasetsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(datasetsDir, f));

  const allResults = {};

  for (const dataset of datasets) {
    const results = runBenchmark(dataset);
    const name = path.basename(dataset, '.json');
    allResults[name] = results;
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const [dataset, results] of Object.entries(allResults)) {
    const baseline = results[0];
    const ctfAggressive = results.find(r => r.name === 'CTF (aggressive)');

    if (ctfAggressive) {
      const savings = ((baseline.tokens - ctfAggressive.tokens) / baseline.tokens * 100).toFixed(1);
      console.log(`${dataset.padEnd(20)} Token savings: ${savings}%`);
    }
  }

  console.log('\n');
}

main();
