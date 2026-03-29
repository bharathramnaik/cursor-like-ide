/**
 * ReAct Agent Unit Tests
 * Testing the agentic workflow implementation
 */

import { ReActAgent } from '../src/agents/react-agent.js';
import { ToolRegistry } from '../src/tools/tool-registry.js';
import { LLMFactory } from '../src/llm/llm-interface.js';

describe('ReActAgent', () => {
  let agent: ReActAgent;
  let tools: ToolRegistry;

  beforeEach(() => {
    tools = new ToolRegistry();
    
    // Use factory to create mock LLM
    const llm = LLMFactory.create({
      provider: 'openai',
      apiKey: 'mock-key',
      defaultModel: 'gpt-4'
    });
    
    agent = new ReActAgent(llm, tools, {} as any, {
      maxIterations: 10,
      temperature: 0.2
    });
  });

  test('should have correct max iterations', () => {
    expect((agent as any).maxIterations).toBe(10);
  });

  test('should have correct temperature', () => {
    expect((agent as any).temperature).toBe(0.2);
  });

  test('should have tool registry', () => {
    expect((agent as any).tools).toBe(tools);
  });
});

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  test('should register default tools', () => {
    const toolNames = registry.getToolNames();
    expect(toolNames.length).toBeGreaterThan(0);
  });

  test('should include file_read tool', () => {
    const toolNames = registry.getToolNames();
    expect(toolNames).toContain('file_read');
  });

  test('should include terminal tool', () => {
    const toolNames = registry.getToolNames();
    expect(toolNames).toContain('terminal');
  });

  test('should execute file_read tool', async () => {
    const result = await registry.execute('file_read', { filePath: 'nonexistent.txt' });
    expect(result.success).toBe(false);
  });

  test('should return error for unknown tool', async () => {
    const result = await registry.execute('unknown_tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });
});

describe('LLMFactory', () => {
  test('should create OpenAI provider', () => {
    const llm = LLMFactory.create({
      provider: 'openai',
      apiKey: 'test-key',
      defaultModel: 'gpt-4'
    });
    expect(llm).toBeDefined();
  });

  test('should create Anthropic provider', () => {
    const llm = LLMFactory.create({
      provider: 'anthropic',
      apiKey: 'test-key',
      defaultModel: 'claude-3'
    });
    expect(llm).toBeDefined();
  });

  test('should throw error for unknown provider', () => {
    expect(() => LLMFactory.create({
      provider: 'unknown' as any,
      apiKey: 'test-key',
      defaultModel: 'model'
    })).toThrow();
  });
});