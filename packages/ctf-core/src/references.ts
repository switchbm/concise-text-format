/**
 * Reference compression manager for CTF format
 */

import { JsonValue, ReferenceEntry } from './types.js';
import { isObject, isArray } from './utils.js';

export class ReferenceManager {
  private references: Map<string, number> = new Map();
  private reverseReferences: Map<number, string> = new Map();
  private valueCounts: Map<string, number> = new Map();
  private nextId: number = 1;

  /**
   * Build reference table from data
   */
  build(
    data: JsonValue,
    minOccurrences: number = 3,
    minLength: number = 5,
    minSavings: number = 10
  ): void {
    // Count all string values
    this.countStrings(data);

    // Create references for beneficial strings
    const entries: ReferenceEntry[] = [];

    for (const [value, count] of this.valueCounts) {
      if (count >= minOccurrences && value.length >= minLength) {
        const savings = this.calculateSavings(value, count);
        if (savings >= minSavings) {
          entries.push({ id: 0, value, occurrences: count, savings });
        }
      }
    }

    // Sort by savings (descending) and assign IDs
    entries.sort((a, b) => b.savings - a.savings);

    for (const entry of entries) {
      this.references.set(entry.value, this.nextId);
      this.reverseReferences.set(this.nextId, entry.value);
      this.nextId++;
    }
  }

  /**
   * Count all string occurrences in data
   */
  private countStrings(data: JsonValue): void {
    if (typeof data === 'string') {
      this.valueCounts.set(data, (this.valueCounts.get(data) || 0) + 1);
    } else if (isArray(data)) {
      for (const item of data) {
        this.countStrings(item);
      }
    } else if (isObject(data)) {
      for (const value of Object.values(data)) {
        this.countStrings(value);
      }
    }
  }

  /**
   * Calculate token savings from using a reference
   */
  private calculateSavings(value: string, count: number): number {
    // Without refs: value.length * count
    const withoutRefs = value.length * count;

    // With refs: 2 * count (for ^N) + value.length + 3 (for ^N=)
    const withRefs = 2 * count + value.length + 3;

    return withoutRefs - withRefs;
  }

  /**
   * Get reference ID for a value (if exists)
   */
  getReference(value: string): number | undefined {
    return this.references.get(value);
  }

  /**
   * Get value for a reference ID
   */
  getValue(id: number): string | undefined {
    return this.reverseReferences.get(id);
  }

  /**
   * Check if a value has a reference
   */
  hasReference(value: string): boolean {
    return this.references.has(value);
  }

  /**
   * Get all reference definitions as CTF lines
   */
  getDefinitions(): string[] {
    const lines: string[] = [];

    // Sort by ID
    const entries = Array.from(this.reverseReferences.entries()).sort((a, b) => a[0] - b[0]);

    for (const [id, value] of entries) {
      // Escape value if needed
      const escapedValue = this.escapeValue(value);
      lines.push(`^${id}=${escapedValue}`);
    }

    return lines;
  }

  /**
   * Escape a value for reference definition
   */
  private escapeValue(value: string): string {
    if (/[:|\t\n\r"^@]/.test(value) || value.includes('  ')) {
      return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return value;
  }

  /**
   * Get total number of references
   */
  get count(): number {
    return this.references.size;
  }

  /**
   * Clear all references
   */
  clear(): void {
    this.references.clear();
    this.reverseReferences.clear();
    this.valueCounts.clear();
    this.nextId = 1;
  }

  /**
   * Get statistics about references
   */
  getStats(): {
    totalReferences: number;
    totalSavings: number;
    avgSavingsPerRef: number;
  } {
    let totalSavings = 0;

    for (const [value, _id] of this.references) {
      const count = this.valueCounts.get(value) || 0;
      totalSavings += this.calculateSavings(value, count);
    }

    return {
      totalReferences: this.references.size,
      totalSavings,
      avgSavingsPerRef: this.references.size > 0 ? totalSavings / this.references.size : 0,
    };
  }
}
