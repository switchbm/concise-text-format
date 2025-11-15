/**
 * OpenAI LLM Provider
 */

import { BaseLLMProvider } from './base.js';

export class OpenAIProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.defaultModel = config.model || 'gpt-4o-mini';
  }

  getName() {
    return 'OpenAI';
  }

  getApiKeyEnvVar() {
    return 'OPENAI_API_KEY';
  }

  async complete(prompt, options = {}) {
    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0;
    const maxTokens = options.maxTokens || 1000;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
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
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  estimateCost(inputTokens, outputTokens, model) {
    // OpenAI pricing (as of Nov 2024)
    const pricing = {
      'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
      'gpt-4o-mini': { input: 0.150 / 1_000_000, output: 0.600 / 1_000_000 },
      'gpt-4-turbo': { input: 10.00 / 1_000_000, output: 30.00 / 1_000_000 },
      'gpt-3.5-turbo': { input: 0.50 / 1_000_000, output: 1.50 / 1_000_000 }
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
  }
}
