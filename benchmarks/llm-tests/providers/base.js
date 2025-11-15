/**
 * Base LLM Provider Interface
 *
 * All LLM providers must implement this interface for pluggable testing.
 */

export class BaseLLMProvider {
  constructor(config = {}) {
    this.config = config;
    this.apiKey = config.apiKey || process.env[this.getApiKeyEnvVar()];

    if (!this.apiKey && this.requiresApiKey()) {
      throw new Error(`API key required for ${this.getName()}. Set ${this.getApiKeyEnvVar()} environment variable.`);
    }
  }

  /**
   * Get the provider name
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented');
  }

  /**
   * Get the environment variable name for API key
   * @returns {string}
   */
  getApiKeyEnvVar() {
    throw new Error('getApiKeyEnvVar() must be implemented');
  }

  /**
   * Whether this provider requires an API key
   * @returns {boolean}
   */
  requiresApiKey() {
    return true;
  }

  /**
   * Send a completion request to the LLM
   *
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Additional options
   * @param {string} options.model - Model to use
   * @param {number} options.temperature - Temperature setting
   * @param {number} options.maxTokens - Maximum tokens in response
   * @returns {Promise<string>} - The LLM's response
   */
  async complete(prompt, options = {}) {
    throw new Error('complete() must be implemented');
  }

  /**
   * Get cost estimate for a completion
   *
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @param {string} model - Model used
   * @returns {number} - Cost in USD
   */
  estimateCost(inputTokens, outputTokens, model) {
    // Default implementation returns 0
    // Providers can override with actual pricing
    return 0;
  }

  /**
   * Test if the provider is properly configured
   * @returns {Promise<boolean>}
   */
  async test() {
    try {
      await this.complete('Say "OK" if you can read this.', {
        maxTokens: 10,
        temperature: 0
      });
      return true;
    } catch (error) {
      console.error(`Provider ${this.getName()} test failed:`, error.message);
      return false;
    }
  }
}
