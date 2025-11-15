/**
 * Type-Aware Validator
 *
 * Validates LLM responses against expected answers with type awareness.
 * This allows for deterministic validation without using LLM-as-judge.
 */

/**
 * Normalize a value for comparison
 */
function normalizeValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    // Trim and lowercase for case-insensitive comparison
    return value.trim().toLowerCase();
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === 'object') {
    const normalized = {};
    for (const [key, val] of Object.entries(value)) {
      normalized[key] = normalizeValue(val);
    }
    return normalized;
  }

  return value;
}

/**
 * Extract answer from LLM response
 *
 * LLMs often wrap answers in explanatory text.
 * This function attempts to extract the actual answer.
 */
function extractAnswer(response, expectedType) {
  if (!response) return null;

  const text = response.trim();

  // Try to extract JSON from response
  const jsonMatch = text.match(/```json\n([\s\S]+?)\n```/) ||
                    text.match(/```\n([\s\S]+?)\n```/) ||
                    text.match(/\{[\s\S]+\}/) ||
                    text.match(/\[[\s\S]+\]/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (e) {
      // Not valid JSON, continue
    }
  }

  // Extract quoted strings
  const quotedMatch = text.match(/"([^"]+)"/);
  if (quotedMatch && expectedType === 'string') {
    return quotedMatch[1];
  }

  // Extract numbers
  if (expectedType === 'number') {
    const numberMatch = text.match(/-?\d+\.?\d*/);
    if (numberMatch) {
      return parseFloat(numberMatch[0]);
    }
  }

  // Extract booleans
  if (expectedType === 'boolean') {
    if (/\b(true|yes)\b/i.test(text)) return true;
    if (/\b(false|no)\b/i.test(text)) return false;
  }

  // If expecting array, try to parse comma-separated values
  if (expectedType === 'array') {
    const values = text.split(',').map(v => v.trim());
    if (values.length > 1) {
      return values;
    }
  }

  // Return trimmed text as fallback
  return text;
}

/**
 * Deep equality check with type awareness
 */
function deepEqual(actual, expected) {
  // Normalize both values
  const normActual = normalizeValue(actual);
  const normExpected = normalizeValue(expected);

  // Handle null/undefined
  if (normActual === null && normExpected === null) return true;
  if (normActual === null || normExpected === null) return false;

  // Handle primitives
  if (typeof normActual !== 'object' && typeof normExpected !== 'object') {
    return normActual === normExpected;
  }

  // Handle arrays
  if (Array.isArray(normActual) && Array.isArray(normExpected)) {
    if (normActual.length !== normExpected.length) return false;
    for (let i = 0; i < normActual.length; i++) {
      if (!deepEqual(normActual[i], normExpected[i])) return false;
    }
    return true;
  }

  // Handle objects
  if (typeof normActual === 'object' && typeof normExpected === 'object') {
    const keysActual = Object.keys(normActual);
    const keysExpected = Object.keys(normExpected);

    if (keysActual.length !== keysExpected.length) return false;

    for (const key of keysExpected) {
      if (!keysActual.includes(key)) return false;
      if (!deepEqual(normActual[key], normExpected[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Fuzzy match for partial answers
 */
function fuzzyMatch(actual, expected, threshold = 0.8) {
  if (deepEqual(actual, expected)) return 1.0;

  const actualStr = JSON.stringify(normalizeValue(actual));
  const expectedStr = JSON.stringify(normalizeValue(expected));

  // Simple similarity: how many expected characters are in actual
  let matches = 0;
  for (const char of expectedStr) {
    if (actualStr.includes(char)) matches++;
  }

  const similarity = matches / expectedStr.length;
  return similarity >= threshold ? similarity : 0;
}

/**
 * Validate an LLM response
 *
 * @param {string} response - The LLM's response
 * @param {*} expected - The expected answer
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
export function validate(response, expected, options = {}) {
  const {
    strict = false,          // Require exact match
    fuzzyThreshold = 0.8,    // Threshold for fuzzy matching
    expectedType = typeof expected  // Expected type
  } = options;

  // Extract answer from response
  const extracted = extractAnswer(response, expectedType);

  // Strict validation
  if (strict) {
    const isCorrect = deepEqual(extracted, expected);
    return {
      correct: isCorrect,
      confidence: isCorrect ? 1.0 : 0.0,
      extracted,
      expected,
      response
    };
  }

  // Fuzzy validation
  const similarity = fuzzyMatch(extracted, expected, fuzzyThreshold);
  const isCorrect = similarity > 0;

  return {
    correct: isCorrect,
    confidence: similarity,
    extracted,
    expected,
    response
  };
}

/**
 * Validate multiple questions
 *
 * @param {Array} results - Array of {response, expected} pairs
 * @param {Object} options - Validation options
 * @returns {Object} - Aggregated results
 */
export function validateBatch(results, options = {}) {
  const validations = results.map(({ response, expected, questionType }) => {
    return validate(response, expected, {
      ...options,
      expectedType: questionType
    });
  });

  const correct = validations.filter(v => v.correct).length;
  const total = validations.length;
  const accuracy = total > 0 ? correct / total : 0;
  const avgConfidence = validations.reduce((sum, v) => sum + v.confidence, 0) / total;

  return {
    accuracy,
    correct,
    total,
    avgConfidence,
    validations
  };
}
