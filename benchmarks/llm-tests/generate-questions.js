#!/usr/bin/env node

/**
 * Generate test questions for datasets
 *
 * This script generates questions without running LLM tests,
 * useful for inspecting what questions will be asked.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateQuestions, generateAllQuestions } from './questions/generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function main() {
  console.log('Generating test questions from datasets...\n');

  // Load datasets
  const datasetsDir = join(__dirname, '..', 'datasets');
  const datasetFiles = ['config.json', 'ecommerce.json', 'employees.json'];

  const datasets = {};
  for (const file of datasetFiles) {
    const name = file.replace('.json', '');
    const path = join(datasetsDir, file);
    const content = readFileSync(path, 'utf-8');
    datasets[name] = JSON.parse(content);
  }

  // Generate questions
  const allQuestions = generateAllQuestions(datasets);

  // Group by dataset
  const byDataset = {};
  for (const question of allQuestions) {
    if (!byDataset[question.dataset]) {
      byDataset[question.dataset] = [];
    }
    byDataset[question.dataset].push(question);
  }

  // Print summary
  console.log('Generated Questions:');
  console.log('='.repeat(60));
  for (const [dataset, questions] of Object.entries(byDataset)) {
    console.log(`${dataset}: ${questions.length} questions`);
  }
  console.log(`\nTotal: ${allQuestions.length} questions`);

  // Print sample questions
  console.log('\nSample Questions (first 10):');
  console.log('='.repeat(60));
  for (let i = 0; i < Math.min(10, allQuestions.length); i++) {
    const q = allQuestions[i];
    console.log(`\n${i + 1}. [${q.dataset}] ${q.question}`);
    console.log(`   Answer: ${JSON.stringify(q.answer)} (${q.type})`);
  }

  // Save to file
  const outputPath = join(__dirname, 'questions', 'generated.json');
  writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2));
  console.log(`\n✓ Saved all questions to: ${outputPath}`);

  // Save organized by dataset
  const organizedPath = join(__dirname, 'questions', 'by-dataset.json');
  writeFileSync(organizedPath, JSON.stringify(byDataset, null, 2));
  console.log(`✓ Saved organized questions to: ${organizedPath}`);
}

main();
