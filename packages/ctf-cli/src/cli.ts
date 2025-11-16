#!/usr/bin/env node

/**
 * CTF CLI - Command-line interface for Compressed Text Format
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { encode, decode } from '@ctf-format/core';

const program = new Command();

program
  .name('ctf')
  .description('Compressed Text Format - Ultra-efficient data serialization for LLM prompts')
  .version('1.0.0');

/**
 * Encode command
 */
program
  .command('encode')
  .description('Encode JSON to CTF format')
  .argument('[input]', 'Input JSON file (or stdin if omitted)')
  .option('-o, --output <file>', 'Output file (or stdout if omitted)')
  .option('-d, --delimiter <char>', 'Delimiter: comma, pipe, tab, or auto', 'auto')
  .option('--no-references', 'Disable reference compression')
  .option('--optimize <level>', 'Optimization level: none, balanced, aggressive', 'balanced')
  .option('--stats', 'Show encoding statistics')
  .option('--pretty', 'Pretty print output (add extra spacing)')
  .action(async (input, options) => {
    try {
      // Read input
      let jsonData: string;
      if (input) {
        jsonData = readFileSync(input, 'utf-8');
      } else {
        // Read from stdin
        jsonData = readFileSync(0, 'utf-8');
      }

      const data = JSON.parse(jsonData);

      // Parse delimiter option
      let delimiter: ',' | '|' | '\t' | 'auto' = 'auto';
      if (options.delimiter === 'comma') delimiter = ',';
      else if (options.delimiter === 'pipe') delimiter = '|';
      else if (options.delimiter === 'tab') delimiter = '\t';
      else if (options.delimiter === 'auto') delimiter = 'auto';

      // Encode
      const ctfData = encode(data, {
        delimiter,
        references: options.references,
        optimize: options.optimize,
      });

      // Show stats if requested
      if (options.stats) {
        const originalBytes = jsonData.length;
        const encodedBytes = ctfData.length;
        const savings = originalBytes - encodedBytes;
        const ratio = ((savings / originalBytes) * 100).toFixed(1);

        console.error('Encoding Statistics:');
        console.error(`  Original size: ${originalBytes} bytes`);
        console.error(`  Encoded size:  ${encodedBytes} bytes`);
        console.error(`  Saved:         ${savings} bytes (${ratio}%)`);
        console.error('');
      }

      // Write output
      if (options.output) {
        writeFileSync(options.output, ctfData, 'utf-8');
        console.error(`Encoded to: ${options.output}`);
      } else {
        console.log(ctfData);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error(`Error: ${String(error)}`);
      }
      process.exit(1);
    }
  });

/**
 * Decode command
 */
program
  .command('decode')
  .description('Decode CTF format to JSON')
  .argument('[input]', 'Input CTF file (or stdin if omitted)')
  .option('-o, --output <file>', 'Output file (or stdout if omitted)')
  .option('--pretty', 'Pretty print JSON output')
  .option('--no-strict', 'Disable strict validation')
  .action(async (input, options) => {
    try {
      // Read input
      let ctfData: string;
      if (input) {
        ctfData = readFileSync(input, 'utf-8');
      } else {
        ctfData = readFileSync(0, 'utf-8');
      }

      // Decode
      const data = decode(ctfData, {
        strict: options.strict,
      });

      // Format output
      const jsonData = options.pretty
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      // Write output
      if (options.output) {
        writeFileSync(options.output, jsonData, 'utf-8');
        console.error(`Decoded to: ${options.output}`);
      } else {
        console.log(jsonData);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error(`Error: ${String(error)}`);
      }
      process.exit(1);
    }
  });

/**
 * Optimize command
 */
program
  .command('optimize')
  .description('Test different encoding strategies and report the best')
  .argument('<input>', 'Input JSON file')
  .option('--report', 'Show detailed comparison report')
  .action(async (input, options) => {
    try {
      const jsonData = readFileSync(input, 'utf-8');
      const data = JSON.parse(jsonData);

      // Test different strategies
      const strategies = [
        { name: 'No optimization', opts: { optimize: 'none' as const, references: false } },
        { name: 'Balanced', opts: { optimize: 'balanced' as const, references: 'auto' as const } },
        { name: 'Aggressive', opts: { optimize: 'aggressive' as const, references: true } },
      ];

      const results = strategies.map(({ name, opts }) => {
        const encoded = encode(data, opts);
        return {
          name,
          size: encoded.length,
          savings: jsonData.length - encoded.length,
          ratio: ((jsonData.length - encoded.length) / jsonData.length * 100).toFixed(1),
        };
      });

      // Find best
      const best = results.reduce((a, b) => (a.size < b.size ? a : b));

      if (options.report) {
        console.log('Optimization Report:');
        console.log(`Original JSON: ${jsonData.length} bytes\n`);

        for (const result of results) {
          const marker = result.name === best.name ? '✓ ' : '  ';
          console.log(`${marker}${result.name}:`);
          console.log(`  Size:    ${result.size} bytes`);
          console.log(`  Savings: ${result.savings} bytes (${result.ratio}%)`);
          console.log('');
        }

        console.log(`Best strategy: ${best.name}`);
      } else {
        console.log(`Best strategy: ${best.name}`);
        console.log(`Size: ${best.size} bytes (${best.ratio}% savings)`);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error(`Error: ${String(error)}`);
      }
      process.exit(1);
    }
  });

/**
 * Format command (decode then re-encode for formatting)
 */
program
  .command('format')
  .description('Format a CTF file (decode and re-encode)')
  .argument('<input>', 'Input CTF file')
  .option('-o, --output <file>', 'Output file (or stdout if omitted)')
  .option('-d, --delimiter <char>', 'Delimiter for re-encoding', 'auto')
  .action(async (input, options) => {
    try {
      const ctfData = readFileSync(input, 'utf-8');
      const data = decode(ctfData);

      // Parse delimiter
      let delimiter: ',' | '|' | '\t' | 'auto' = 'auto';
      if (options.delimiter === 'comma') delimiter = ',';
      else if (options.delimiter === 'pipe') delimiter = '|';
      else if (options.delimiter === 'tab') delimiter = '\t';

      const formatted = encode(data, { delimiter });

      if (options.output) {
        writeFileSync(options.output, formatted, 'utf-8');
        console.error(`Formatted to: ${options.output}`);
      } else {
        console.log(formatted);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error(`Error: ${String(error)}`);
      }
      process.exit(1);
    }
  });

program.parse();
