/**
 * Auto-optimization analyzer for CTF format
 */

import {
  JsonValue,
  JsonObject,
  JsonArray,
  DataAnalysis,
  OptimizationStrategy,
  Delimiter,
} from './types.js';
import {
  isObject,
  isArray,
  haveSameStructure,
  allPrimitiveValues,
  countOccurrences,
  estimateTokens,
} from './utils.js';

export class Optimizer {
  /**
   * Analyze data structure and return recommendations
   */
  analyze(data: JsonValue): DataAnalysis {
    const analysis: DataAnalysis = {
      totalArrays: 0,
      tabularCandidates: 0,
      columnarCandidates: 0,
      repeatedValues: new Map(),
      estimatedTokens: 0,
      delimiterFrequency: new Map([
        ['|', 0],
        [',', 0],
        ['\t', 0],
      ]),
    };

    this.analyzeValue(data, analysis);

    // Estimate tokens from JSON representation
    analysis.estimatedTokens = estimateTokens(JSON.stringify(data));

    return analysis;
  }

  /**
   * Recursively analyze a value
   */
  private analyzeValue(value: JsonValue, analysis: DataAnalysis): void {
    if (isArray(value)) {
      analysis.totalArrays++;

      // Check if tabular candidate
      if (this.isTabularCandidate(value)) {
        analysis.tabularCandidates++;
      }

      // Check if columnar candidate
      if (this.isColumnarCandidate(value)) {
        analysis.columnarCandidates++;
      }

      // Analyze array elements
      for (const item of value) {
        this.analyzeValue(item, analysis);
      }

      // Count delimiter occurrences in array data
      this.analyzeDelimiterFrequency(value, analysis);
    } else if (isObject(value)) {
      for (const val of Object.values(value)) {
        this.analyzeValue(val, analysis);
      }
    } else if (typeof value === 'string') {
      // Count repeated values
      const count = analysis.repeatedValues.get(value) || 0;
      analysis.repeatedValues.set(value, count + 1);
    }
  }

  /**
   * Check if array is a tabular candidate
   */
  private isTabularCandidate(arr: JsonArray): boolean {
    return arr.length >= 3 && haveSameStructure(arr) && allPrimitiveValues(arr);
  }

  /**
   * Check if array is a columnar candidate
   */
  private isColumnarCandidate(arr: JsonArray): boolean {
    // Columnar makes sense for very large arrays with repetition
    if (arr.length < 1000) return false;
    if (!haveSameStructure(arr)) return false;
    if (!allPrimitiveValues(arr)) return false;

    // Check for high repetition in columns
    const objects = arr as JsonObject[];
    const keys = Object.keys(objects[0]);

    for (const key of keys) {
      const values = objects.map((obj) => String(obj[key]));
      const uniqueValues = new Set(values);

      // If any column has >30% repetition, it's a good candidate
      const repetitionRatio = 1 - uniqueValues.size / values.length;
      if (repetitionRatio > 0.3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Analyze which delimiter appears least in the data
   */
  private analyzeDelimiterFrequency(arr: JsonArray, analysis: DataAnalysis): void {
    const jsonStr = JSON.stringify(arr);

    analysis.delimiterFrequency.set('|', (analysis.delimiterFrequency.get('|') || 0) + countOccurrences(jsonStr, '|'));
    analysis.delimiterFrequency.set(',', (analysis.delimiterFrequency.get(',') || 0) + countOccurrences(jsonStr, ','));
    analysis.delimiterFrequency.set('\t', (analysis.delimiterFrequency.get('\t') || 0) + countOccurrences(jsonStr, '\t'));
  }

  /**
   * Recommend optimization strategy based on analysis
   */
  recommendStrategy(analysis: DataAnalysis): OptimizationStrategy {
    if (analysis.columnarCandidates > 0) {
      return 'columnar';
    }

    if (analysis.totalArrays > 0) {
      const tabularRatio = analysis.tabularCandidates / analysis.totalArrays;
      if (tabularRatio > 0.5) {
        return 'tabular-heavy';
      }
    }

    return 'balanced';
  }

  /**
   * Choose optimal delimiter based on data
   */
  chooseDelimiter(analysis: DataAnalysis): Delimiter {
    const frequencies = analysis.delimiterFrequency;

    // Find delimiter with minimum occurrences
    let minDelimiter: Delimiter = '|';
    let minCount = Infinity;

    for (const [delimiter, count] of frequencies) {
      if (count < minCount) {
        minCount = count;
        minDelimiter = delimiter as Delimiter;
      }
    }

    // Prefer | > \t > , for token efficiency (all else being equal)
    if (frequencies.get('|') === frequencies.get('\t') && frequencies.get('|') === frequencies.get(',')) {
      return '|';
    }

    return minDelimiter;
  }

  /**
   * Estimate token savings from using references
   */
  estimateReferenceSavings(analysis: DataAnalysis, minOccurrences: number = 3, minLength: number = 5): number {
    let totalSavings = 0;

    for (const [value, count] of analysis.repeatedValues) {
      if (count >= minOccurrences && value.length >= minLength) {
        // Savings = (occurrences - 1) × length - (occurrences × 2)
        const savings = (count - 1) * value.length - count * 2;
        if (savings > 0) {
          totalSavings += savings;
        }
      }
    }

    return totalSavings;
  }
}
