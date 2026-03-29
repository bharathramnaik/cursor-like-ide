/**
 * ReAct Agent - Reason and Act Loop
 * Core component of Cursor's agentic workflow
 * 
 * Similar to Cursor's Composer model implementation
 */

import { LLMInterface } from '../llm/llm-interface.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { ContextManager } from '../context/context-manager.js';

export interface ThoughtAction {
  thought: string;
  action: string;
  actionInput: Record<string, unknown>;
}

export interface AgentConfig {
  maxIterations: number;
  temperature: number;
  modelName: string;
}

export class ReActAgent {
  private llm: LLMInterface;
  private tools: ToolRegistry;
  private context: ContextManager;
  private maxIterations: number;
  private temperature: number;
  private modelName: string;
  
  constructor(
    llm: LLMInterface,
    tools: ToolRegistry,
    context: ContextManager,
    config: Partial<AgentConfig> = {}
  ) {
    this.llm = llm;
    this.tools = tools;
    this.context = context;
    this.maxIterations = config.maxIterations ?? 10;
    this.temperature = config.temperature ?? 0.2;
    this.modelName = config.modelName ?? 'gpt-4-turbo';
  }

  /**
   * Main execution loop - Reason, Act, Observe
   */
  async execute(userRequest: string): Promise<string> {
    // Initialize conversation with system prompt
    const messages = this.buildInitialPrompt(userRequest);
    
    let iteration = 0;
    let finalResponse = '';
    
    while (iteration < this.maxIterations) {
      iteration++;
      
      // Step 1: REASON - Get next action from LLM
      const response = await this.llm.chatCompletion({
        messages,
        temperature: this.temperature
      });
      
      // Step 2: Parse the response to extract thought, action, input
      const { thought, action, actionInput } = this.parseResponse(response);
      
      // Check if task is complete
      if (action.toLowerCase() === 'final_answer') {
        finalResponse = this.extractFinalAnswer(actionInput);
        break;
      }
      
      // Add thought to conversation
      messages.push({ role: 'assistant', content: response });
      
      // Step 3: ACT - Execute the tool
      try {
        const toolResult = await this.tools.execute(action, actionInput);
        
        // Step 4: OBSERVE - Add result to conversation
        const observation = this.formatObservation(toolResult);
        messages.push({ role: 'user', content: observation });
        
      } catch (error) {
        // Handle tool execution errors
        messages.push({
          role: 'user',
          content: `Error executing ${action}: ${(error as Error).message}`
        });
      }
    }
    
    if (iteration >= this.maxIterations) {
      finalResponse = 'Maximum iterations reached without completing the task.';
    }
    
    return finalResponse;
  }

  /**
   * Build initial prompt with system message and context
   */
  private buildInitialPrompt(userRequest: string) {
    return [
      {
        role: 'system',
        content: this.getSystemPrompt()
      },
      {
        role: 'user',
        content: userRequest
      }
    ];
  }

  /**
   * Get the system prompt
   */
  private getSystemPrompt(): string {
    return `You are an AI coding assistant following the Cursor agentic workflow.

AVAILABLE TOOLS:
${this.tools.getToolDescriptions()}

WORKFLOW:
1. REASON: Analyze the request and plan your approach
2. ACT: Use appropriate tools to accomplish the task
3. OBSERVE: Check tool results and adjust your approach
4. FINAL_ANSWER: When task is complete, respond with final_answer

Always explain your reasoning before taking actions. Use tools effectively to complete the user's request.
When you have completed the task, use: ACTION: final_answer, ACTION_INPUT: { "response": "your final response" }`;
  }

  /**
   * Parse LLM response to extract thought, action, and input
   */
  private parseResponse(response: string): ThoughtAction {
    const thoughtMatch = response.match(/THOUGHT:\s*([\s\S]*?)(?=ACTION:|$)/i);
    const actionMatch = response.match(/ACTION:\s*([\s\S]*?)(?=ACTION_INPUT:|$)/i);
    const actionInputMatch = response.match(/ACTION_INPUT:\s*([\s\S]*)/i);
    
    return {
      thought: thoughtMatch ? thoughtMatch[1].trim() : '',
      action: actionMatch ? actionMatch[1].trim() : 'final_answer',
      actionInput: this.parseActionInput(actionInputMatch ? actionInputMatch[1].trim() : '{}')
    };
  }

  /**
   * Parse action input JSON
   */
  private parseActionInput(input: string): Record<string, unknown> {
    try {
      return JSON.parse(input);
    } catch {
      return { response: input };
    }
  }

  /**
   * Extract final answer from action input
   */
  private extractFinalAnswer(actionInput: Record<string, unknown>): string {
    return actionInput.response as string ?? 'Task completed';
  }

  /**
   * Format tool execution result as observation
   */
  private formatObservation(result: { success: boolean; output?: string; error?: string }): string {
    if (result.success) {
      return `Observation: ${result.output ?? 'Completed successfully'}`;
    }
    return `Error: ${result.error ?? 'Unknown error occurred'}`;
  }
}