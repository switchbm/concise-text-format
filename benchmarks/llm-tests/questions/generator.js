/**
 * Question Generator
 *
 * Generates test questions from JSON datasets to validate LLM comprehension
 */

/**
 * Generate questions for a dataset
 *
 * @param {Object|Array} data - The dataset
 * @param {string} datasetName - Name of the dataset
 * @returns {Array} - Array of questions
 */
export function generateQuestions(data, datasetName) {
  const questions = [];

  // Handle top-level array
  if (Array.isArray(data)) {
    questions.push(...generateArrayQuestions(data, 'data', datasetName));
  } else if (typeof data === 'object' && data !== null) {
    questions.push(...generateObjectQuestions(data, '', datasetName));
  }

  return questions;
}

/**
 * Generate questions for an object
 */
function generateObjectQuestions(obj, path, datasetName, maxDepth = 3, currentDepth = 0) {
  const questions = [];

  if (currentDepth >= maxDepth) return questions;

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;

    // Question: What is the value of X?
    if (isPrimitive(value)) {
      questions.push({
        id: `${datasetName}_${fullPath}_value`,
        dataset: datasetName,
        question: `What is the value of "${fullPath}"?`,
        answer: value,
        type: typeof value,
        path: fullPath
      });
    }

    // Question: What type is X?
    questions.push({
      id: `${datasetName}_${fullPath}_type`,
      dataset: datasetName,
      question: `What type is "${fullPath}"?`,
      answer: Array.isArray(value) ? 'array' : typeof value,
      type: 'string',
      path: fullPath
    });

    // Recurse into nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      questions.push(...generateObjectQuestions(value, fullPath, datasetName, maxDepth, currentDepth + 1));
    }

    // Handle arrays
    if (Array.isArray(value)) {
      questions.push(...generateArrayQuestions(value, fullPath, datasetName));
    }
  }

  return questions;
}

/**
 * Generate questions for an array
 */
function generateArrayQuestions(arr, path, datasetName) {
  const questions = [];

  // Question: How many items in array?
  questions.push({
    id: `${datasetName}_${path}_count`,
    dataset: datasetName,
    question: `How many items are in "${path}"?`,
    answer: arr.length,
    type: 'number',
    path
  });

  if (arr.length === 0) return questions;

  // Question: What is the first item?
  questions.push({
    id: `${datasetName}_${path}_first`,
    dataset: datasetName,
    question: `What is the first item in "${path}"?`,
    answer: arr[0],
    type: typeof arr[0],
    path
  });

  // Question: What is the last item?
  if (arr.length > 1) {
    questions.push({
      id: `${datasetName}_${path}_last`,
      dataset: datasetName,
      question: `What is the last item in "${path}"?`,
      answer: arr[arr.length - 1],
      type: typeof arr[arr.length - 1],
      path
    });
  }

  // If array of objects with consistent schema
  if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && !Array.isArray(arr[0])) {
    const firstKeys = Object.keys(arr[0]);

    // Question: What fields does each item have?
    questions.push({
      id: `${datasetName}_${path}_fields`,
      dataset: datasetName,
      question: `What fields does each item in "${path}" have?`,
      answer: firstKeys,
      type: 'array',
      path
    });

    // Question: What is the value of field X in item Y?
    if (arr.length > 0) {
      for (const key of firstKeys.slice(0, 3)) { // Limit to 3 fields
        questions.push({
          id: `${datasetName}_${path}_0_${key}`,
          dataset: datasetName,
          question: `What is the "${key}" of the first item in "${path}"?`,
          answer: arr[0][key],
          type: typeof arr[0][key],
          path: `${path}[0].${key}`
        });
      }
    }

    // Question: Find item where field = value
    if (arr.length > 1) {
      const firstItem = arr[0];
      const searchKey = firstKeys[0];
      const searchValue = firstItem[searchKey];

      if (isPrimitive(searchValue)) {
        questions.push({
          id: `${datasetName}_${path}_find_${searchKey}`,
          dataset: datasetName,
          question: `Find the item in "${path}" where "${searchKey}" equals "${searchValue}". What is this item?`,
          answer: firstItem,
          type: 'object',
          path: `${path}[0]`
        });
      }
    }
  }

  return questions;
}

/**
 * Check if value is a primitive
 */
function isPrimitive(value) {
  return value === null ||
         typeof value === 'string' ||
         typeof value === 'number' ||
         typeof value === 'boolean';
}

/**
 * Generate questions from multiple datasets
 */
export function generateAllQuestions(datasets) {
  const allQuestions = [];

  for (const [name, data] of Object.entries(datasets)) {
    const questions = generateQuestions(data, name);
    allQuestions.push(...questions);
  }

  return allQuestions;
}

/**
 * Filter questions by criteria
 */
export function filterQuestions(questions, criteria = {}) {
  let filtered = [...questions];

  if (criteria.dataset) {
    filtered = filtered.filter(q => q.dataset === criteria.dataset);
  }

  if (criteria.type) {
    filtered = filtered.filter(q => q.type === criteria.type);
  }

  if (criteria.limit) {
    filtered = filtered.slice(0, criteria.limit);
  }

  return filtered;
}
