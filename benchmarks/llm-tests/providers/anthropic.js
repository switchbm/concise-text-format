/**
 * Anthropic LLM Provider
 */

import { BaseLLMProvider } from './base.js';

export class AnthropicProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    this.defaultModel = config.model || 'claude-3-5-haiku-20241022';
    this.version = config.version || '2023-06-01';
  }

  getName() {
    return 'Anthropic';
  }

  getApiKeyEnvVar() {
    return 'ANTHROPIC_API_KEY';
  }

  async complete(prompt, options = {}) {
    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0;
    const maxTokens = options.maxTokens || 1000;

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.version
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  estimateCost(inputTokens, outputTokens, model) {
    // Anthropic pricing (as of Nov 2024)
    const pricing = {
      'claude-3-5-sonnet-20241022': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
      'claude-3-5-haiku-20241022': { input: 0.80 / 1_000_000, output: 4.00 / 1_000_000 },
      'claude-3-opus-20240229': { input: 15.00 / 1_000_000, output: 75.00 / 1_000_000 },
      'claude-3-sonnet-20240229': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
      'claude-3-haiku-20240307': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 }
    };

    const modelPricing = pricing[model] || pricing['claude-3-5-haiku-20241022'];
    return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
  }
}
