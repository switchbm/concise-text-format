#!/usr/bin/env node

/**
 * Run benchmarks with Claude 4.5 Haiku
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { encode as encodeCTF } from './packages/ctf-core/dist/index.js';
import { encode as encodeTokens } from 'gpt-tokenizer';
import { createProvider } from './benchmarks/llm-tests/providers/index.js';
import { generateQuestions, filterQuestions } from './benchmarks/llm-tests/questions/generator.js';
import { validateBatch } from './benchmarks/llm-tests/validators/type-aware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load dataset
const datasetsDir = join(__dirname, 'benchmarks', 'datasets');
const configPath = join(datasetsDir, 'config.json');
const configData = JSON.parse(readFileSync(configPath, 'utf-8'));

console.log('CTF LLM Comprehension Test - Claude 4.5 Haiku');
console.log('='.repeat(70));

// Create provider with Claude 4.5 Haiku
const provider = createProvider('anthropic', {
  model: 'claude-haiku-4-5-20251001',
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log(`Using model: claude-haiku-4-5-20251001`);
console.log('='.repeat(70));

// Test provider
console.log('\nTesting provider connection...');
const isWorking = await provider.test();
if (!isWorking) {
  console.error('✗ Provider test failed');
  process.exit(1);
}
console.log('✓ Provider is working\n');

// Test JSON format
console.log('Testing config with JSON format...');
const jsonQuestions = filterQuestions(generateQuestions(configData, 'config'), { limit: 10 });
const jsonData = JSON.stringify(configData, null, 2);
const jsonTokens = encodeTokens(jsonData).length;

console.log(`Generated ${jsonQuestions.length} questions`);
console.log(`Data size: ${jsonData.length} bytes, ${jsonTokens} tokens`);

const jsonResults = [];
for (let i = 0; i < jsonQuestions.length; i++) {
  const q = jsonQuestions[i];
  process.stdout.write(`[${i + 1}/${jsonQuestions.length}] ${q.question.substring(0, 50)}...`);

  const prompt = `Here is some data in JSON format:

${jsonData}

Question: ${q.question}

Please provide a concise answer. If the answer is a specific value, provide just that value.`;

  try {
    const response = await provider.complete(prompt, { temperature: 0, maxTokens: 500 });
    jsonResults.push({
      question: q.question,
      response,
      expected: q.answer,
      questionType: q.type
    });
    process.stdout.write(` ✓\n`);
  } catch (error) {
    process.stdout.write(` ✗ (${error.message})\n`);
    jsonResults.push({
      question: q.question,
      response: '',
      expected: q.answer,
      questionType: q.type,
      error: error.message
    });
  }

  await new Promise(resolve => setTimeout(resolve, 100));
}

const jsonValidation = validateBatch(jsonResults);

// Test CTF format
console.log('\nTesting config with CTF format...');
const ctfQuestions = filterQuestions(generateQuestions(configData, 'config'), { limit: 10 });
const ctfData = encodeCTF(configData, { optimize: 'balanced', references: true });
const ctfTokens = encodeTokens(ctfData).length;

console.log(`Generated ${ctfQuestions.length} questions`);
console.log(`Data size: ${ctfData.length} bytes, ${ctfTokens} tokens`);

const ctfResults = [];
for (let i = 0; i < ctfQuestions.length; i++) {
  const q = ctfQuestions[i];
  process.stdout.write(`[${i + 1}/${ctfQuestions.length}] ${q.question.substring(0, 50)}...`);

  const prompt = `Here is some data in CTF (Compressed Text Format) format:

${ctfData}

Question: ${q.question}

Please provide a concise answer. If the answer is a specific value, provide just that value.`;

  try {
    const response = await provider.complete(prompt, { temperature: 0, maxTokens: 500 });
    ctfResults.push({
      question: q.question,
      response,
      expected: q.answer,
      questionType: q.type
    });
    process.stdout.write(` ✓\n`);
  } catch (error) {
    process.stdout.write(` ✗ (${error.message})\n`);
    ctfResults.push({
      question: q.question,
      response: '',
      expected: q.answer,
      questionType: q.type,
      error: error.message
    });
  }

  await new Promise(resolve => setTimeout(resolve, 100));
}

const ctfValidation = validateBatch(ctfResults);

// Print results
console.log(`\n${'-'.repeat(70)}`);
console.log('RESULTS - Claude 4.5 Haiku');
console.log('-'.repeat(70));
console.log('\nFormat          Accuracy   Confidence   Data Tokens');
console.log('-'.repeat(70));
console.log(`JSON            ${(jsonValidation.accuracy * 100).toFixed(1)}%       ${(jsonValidation.avgConfidence * 100).toFixed(1)}%        ${jsonTokens}`);
console.log(`CTF             ${(ctfValidation.accuracy * 100).toFixed(1)}%       ${(ctfValidation.avgConfidence * 100).toFixed(1)}%        ${ctfTokens}`);

const tokenSavings = ((jsonTokens - ctfTokens) / jsonTokens * 100).toFixed(1);
const accuracyDiff = ((ctfValidation.accuracy - jsonValidation.accuracy) * 100).toFixed(1);

console.log(`\n${'='.repeat(70)}`);
console.log('IMPROVEMENTS (CTF vs JSON)');
console.log('='.repeat(70));
console.log(`Token Reduction: -${tokenSavings}%`);
console.log(`Accuracy Change: ${accuracyDiff >= 0 ? '+' : ''}${accuracyDiff}%`);
