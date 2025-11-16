/**
 * LLM-as-Judge Validator
 *
 * Uses an LLM to evaluate whether a response correctly answers a question.
 * More flexible than type-aware validation but slower and more expensive.
 */

/**
 * Create judgment prompt
 */
function createJudgmentPrompt(question, response, expectedAnswer) {
  return `You are evaluating whether an AI assistant correctly answered a question.

Question: ${question}
Expected Answer: ${JSON.stringify(expectedAnswer)}
Assistant's Response: ${response}

Does the assistant's response correctly answer the question? Consider:
1. Is the core answer accurate?
2. Does it match the expected answer (allowing for minor formatting differences)?
3. For numbers, are they numerically equal?
4. For strings, are they semantically equivalent (case-insensitive)?
5. For arrays/objects, do they contain the same information?

Respond with ONLY one of these verdicts:
- CORRECT: The answer is accurate and matches the expected answer
- INCORRECT: The answer is wrong or doesn't match the expected answer
- PARTIAL: The answer is partially correct or contains the right information with extra context

Format your response as:
VERDICT: [CORRECT/INCORRECT/PARTIAL]
CONFIDENCE: [0-100]
REASON: [brief explanation]`;
}

/**
 * Parse LLM judgment response
 */
function parseJudgment(judgmentText) {
  const verdictMatch = judgmentText.match(/VERDICT:\s*(CORRECT|INCORRECT|PARTIAL)/i);
  const confidenceMatch = judgmentText.match(/CONFIDENCE:\s*(\d+)/);
  const reasonMatch = judgmentText.match(/REASON:\s*(.+?)(?:\n|$)/i);

  const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : 'INCORRECT';
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0;
  const reason = reasonMatch ? reasonMatch[1].trim() : 'No reason provided';

  return {
    verdict,
    correct: verdict === 'CORRECT',
    partial: verdict === 'PARTIAL',
    confidence: verdict === 'CORRECT' ? confidence : (verdict === 'PARTIAL' ? confidence * 0.5 : 0),
    reason
  };
}

/**
 * Validate using LLM as judge
 *
 * @param {string} question - The original question
 * @param {string} response - The LLM's response
 * @param {*} expected - The expected answer
 * @param {Object} provider - LLM provider instance
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Validation result
 */
export async function validateWithJudge(question, response, expected, provider, options = {}) {
  const {
    judgeModel = null,  // Use specific model for judging
    temperature = 0
  } = options;

  // Create judgment prompt
  const prompt = createJudgmentPrompt(question, response, expected);

  try {
    // Get LLM judgment
    const judgment = await provider.complete(prompt, {
      model: judgeModel,
      temperature,
      maxTokens: 200
    });

    // Parse judgment
    const parsed = parseJudgment(judgment);

    return {
      correct: parsed.correct,
      confidence: parsed.confidence,
      verdict: parsed.verdict,
      reason: parsed.reason,
      judgment,
      extracted: response,
      expected,
      method: 'llm-judge'
    };
  } catch (error) {
    return {
      correct: false,
      confidence: 0,
      verdict: 'ERROR',
      reason: error.message,
      extracted: response,
      expected,
      method: 'llm-judge',
      error: error.message
    };
  }
}

/**
 * Validate batch using LLM judge
 *
 * @param {Array} testCases - Array of {question, response, expected} objects
 * @param {Object} provider - LLM provider instance
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Aggregated results
 */
export async function validateBatchWithJudge(testCases, provider, options = {}) {
  const validations = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < testCases.length; i++) {
    const { question, response, expected } = testCases[i];

    const validation = await validateWithJudge(question, response, expected, provider, options);
    validations.push(validation);

    // Estimate tokens for judging
    const prompt = createJudgmentPrompt(question, response, expected);
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = validation.judgment ? Math.ceil(validation.judgment.length / 4) : 0;
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;

    // Small delay to avoid rate limits
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const correct = validations.filter(v => v.correct).length;
  const partial = validations.filter(v => v.partial).length;
  const total = validations.length;
  const accuracy = total > 0 ? correct / total : 0;
  const accuracyWithPartial = total > 0 ? (correct + partial * 0.5) / total : 0;
  const avgConfidence = total > 0 ? validations.reduce((sum, v) => sum + v.confidence, 0) / total : 0;

  return {
    accuracy,
    accuracyWithPartial,
    correct,
    partial,
    incorrect: total - correct - partial,
    total,
    avgConfidence,
    validations,
    judgeTokens: {
      input: totalInputTokens,
      output: totalOutputTokens,
      total: totalInputTokens + totalOutputTokens
    },
    judgeCost: provider.estimateCost(totalInputTokens, totalOutputTokens, provider.defaultModel)
  };
}

/**
 * Compare type-aware and LLM judge validations
 *
 * @param {Object} typeAwareResults - Results from type-aware validation
 * @param {Object} judgeResults - Results from LLM judge validation
 * @returns {Object} - Comparison analysis
 */
export function compareValidationMethods(typeAwareResults, judgeResults) {
  const agreements = [];
  const disagreements = [];

  // Ensure both have same number of validations
  const minLength = Math.min(
    typeAwareResults.validations.length,
    judgeResults.validations.length
  );

  for (let i = 0; i < minLength; i++) {
    const typeAware = typeAwareResults.validations[i];
    const judge = judgeResults.validations[i];

    if (typeAware.correct === judge.correct) {
      agreements.push({ index: i, typeAware, judge });
    } else {
      disagreements.push({
        index: i,
        typeAware,
        judge,
        typeAwareSays: typeAware.correct ? 'CORRECT' : 'INCORRECT',
        judgeSays: judge.verdict
      });
    }
  }

  const agreementRate = minLength > 0 ? agreements.length / minLength : 0;

  return {
    agreementRate,
    agreements: agreements.length,
    disagreements: disagreements.length,
    total: minLength,
    typeAwareAccuracy: typeAwareResults.accuracy,
    judgeAccuracy: judgeResults.accuracy,
    judgeAccuracyWithPartial: judgeResults.accuracyWithPartial,
    disagreementDetails: disagreements
  };
}
