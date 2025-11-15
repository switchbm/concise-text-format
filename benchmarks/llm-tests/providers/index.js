/**
 * LLM Provider Registry
 *
 * Centralized access to all LLM providers
 */

import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';

export const PROVIDERS = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
};

/**
 * Create an LLM provider instance
 *
 * @param {string} providerName - Name of the provider (openai, anthropic, etc.)
 * @param {Object} config - Provider configuration
 * @returns {BaseLLMProvider} - Provider instance
 */
export function createProvider(providerName, config = {}) {
  const ProviderClass = PROVIDERS[providerName.toLowerCase()];

  if (!ProviderClass) {
    throw new Error(
      `Unknown provider: ${providerName}. Available providers: ${Object.keys(PROVIDERS).join(', ')}`
    );
  }

  return new ProviderClass(config);
}

/**
 * Get list of available providers
 * @returns {string[]}
 */
export function getAvailableProviders() {
  return Object.keys(PROVIDERS);
}

/**
 * Test all configured providers
 * @returns {Promise<Object>} - Map of provider name to test result
 */
export async function testAllProviders() {
  const results = {};

  for (const [name, ProviderClass] of Object.entries(PROVIDERS)) {
    try {
      const provider = new ProviderClass();
      results[name] = await provider.test();
    } catch (error) {
      results[name] = false;
      console.error(`Failed to initialize ${name}:`, error.message);
    }
  }

  return results;
}

export { OpenAIProvider, AnthropicProvider };
