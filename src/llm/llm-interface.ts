/**
 * LLM Interface - Abstraction layer for LLM providers
 * Supports OpenAI, Anthropic, and local models
 * Following Cursor's approach of routing to different models
 */

import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey: string;
  baseURL?: string;
  defaultModel: string;
}

export interface LLMInterface {
  chatCompletion(options: ChatCompletionOptions): Promise<string>;
  embedding(text: string): Promise<number[]>;
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider implements LLMInterface {
  private client: OpenAI;
  
  constructor(config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model ?? 'gpt-4-turbo',
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000
    });
    
    return response.choices[0]?.message?.content ?? '';
  }

  async embedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });
    
    return response.data[0]?.embedding ?? [];
  }
}

/**
 * Anthropic Provider Implementation
 */
export class AnthropicProvider implements LLMInterface {
  private apiKey: string;
  private baseURL: string;
  
  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL ?? 'https://api.anthropic.com';
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model ?? 'claude-3-sonnet-20240229',
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000
      })
    });
    
    const data = await response.json();
    return data.content?.[0]?.text ?? '';
  }

  async embedding(text: string): Promise<number[]> {
    throw new Error('Embeddings not supported by Anthropic');
  }
}

/**
 * Factory to create LLM provider
 */
export class LLMFactory {
  static create(config: LLMConfig): LLMInterface {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
}