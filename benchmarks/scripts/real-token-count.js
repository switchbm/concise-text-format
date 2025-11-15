#!/usr/bin/env node

/**
 * REAL LLM Token Counting Benchmark for CTF format
 * Uses actual GPT tokenizer (cl100k_base - used by GPT-4, GPT-3.5-turbo)
 */

import { encode as encodeTokens } from 'gpt-tokenizer';
import { readFileSync } from 'fs';
import { encode as encodeCTF } from '../../packages/ctf-core/dist/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Count actual GPT tokens
 */
function countTokens(text) {
  return encodeTokens(text).length;
}

/**
 * Run benchmark on a dataset using REAL tokenizer
 */
function runBenchmark(datasetPath) {
  const datasetName = datasetPath.split('/').pop().replace('.json', '');
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Dataset: ${datasetName}`);
  console.log('='.repeat(60));

  // Load data
  const jsonData = readFileSync(datasetPath, 'utf-8');
  const data = JSON.parse(jsonData);

  // Format in different ways
  const formats = {
    'JSON (formatted)': JSON.stringify(data, null, 2),
    'JSON (compact)': JSON.stringify(data),
    'CTF (balanced)': encodeCTF(data, { optimize: 'balanced' }),
    'CTF (aggressive)': encodeCTF(data, { optimize: 'aggressive', references: true }),
  };

  // Count REAL tokens using GPT tokenizer
  const results = [];
  for (const [name, content] of Object.entries(formats)) {
    const tokens = countTokens(content);
    const bytes = content.length;
    results.push({ name, tokens, bytes });
  }

  // Calculate savings
  const jsonTokens = results[0].tokens;
  for (const result of results) {
    result.savings = ((jsonTokens - result.tokens) / jsonTokens * 100).toFixed(1);
  }

  // Print results
  console.log('\nFormat                    Bytes      Tokens     Savings');
  console.log('-'.repeat(60));

  for (const result of results) {
    const savingsStr = result === results[0]
      ? '(baseline)'
      : `-${result.savings}%`;

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
  console.log('CTF Token Count Benchmark - REAL LLM TOKENIZER');
  console.log('='.repeat(60));
  console.log('Using: GPT-4/GPT-3.5-turbo tokenizer (cl100k_base)');
  console.log('This measures ACTUAL token counts, not approximations!\n');

  const datasetsDir = join(__dirname, '..', 'datasets');
  const datasets = [
    join(datasetsDir, 'config.json'),
    join(datasetsDir, 'ecommerce.json'),
    join(datasetsDir, 'employees.json'),
  ];

  const allResults = {};

  for (const dataset of datasets) {
    const results = runBenchmark(dataset);
    const name = dataset.split('/').pop().replace('.json', '');
    allResults[name] = results;
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('SUMMARY - REAL TOKEN SAVINGS');
  console.log('='.repeat(60));

  for (const [dataset, results] of Object.entries(allResults)) {
    const baseline = results[0];
    const ctfAggressive = results.find(r => r.name === 'CTF (aggressive)');

    if (ctfAggressive) {
      const tokenSavings = ((baseline.tokens - ctfAggressive.tokens) / baseline.tokens * 100).toFixed(1);
      const byteSavings = ((baseline.bytes - ctfAggressive.bytes) / baseline.bytes * 100).toFixed(1);

      console.log(`${dataset.padEnd(20)} Tokens: -${tokenSavings}%  |  Bytes: -${byteSavings}%`);
    }
  }

  console.log('\n✅ These are REAL token counts from GPT-4/3.5 tokenizer!\n');
}

main();
