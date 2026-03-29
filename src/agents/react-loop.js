import { ToolResult } from '../tools/tool-types.js';
import { LLMAbstractionLayer } from '../llm/llm-abstraction.js';
import { ToolHarness } from '../tools/tool-harness.js';
import { MCPManager } from '../context/mcp-manager.js';

export class ReActLoop {
  constructor(llmLayer, toolHarness, mcpManager) {
    this.llmLayer = llmLayer;
    this.toolHarness = toolHarness;
    this.mcpManager = mcpManager;
    this.maxIterations = 10;
  }
  
  async initialize() {
    // Initialize any ReAct-specific components
    console.log('🔄 ReAct loop initialized');
  }
  
  async execute(userInput) {
    console.log(`🎯 Processing request: ${userInput}`);
    
    // Initialize conversation state
    let conversationHistory = [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: userInput }
    ];
    
    let iteration = 0;
    let isDone = false;
    let result = '';
    
    // Main ReAct loop: Reason -> Act -> Observe
    while (!isDone && iteration < this.maxIterations) {
      iteration++;
      console.log(`🔁 ReAct iteration ${iteration}`);
      
      // REASON: Get next action from LLM
      const reasoning = await this.llmLayer.generateCompletion({
        messages: conversationHistory,
        temperature: 0.2,
        maxTokens: 2000
      });
      
      // Parse the LLM response to extract thought, action, and action input
      const { thought, action, actionInput } = this.parseReasoningOutput(reasoning);
      
      console.log(`💭 Thought: ${thought}`);
      console.log(`⚡ Action: ${action}`);
      console.log(`📥 Action Input: ${JSON.stringify(actionInput)}`);
      
      // Add reasoning to conversation history
      conversationHistory.push({ role: 'assistant', content: reasoning });
      
      // ACT: Execute the action if it's not a final answer
      if (action.toLowerCase() === 'final_answer') {
        isDone = true;
        result = actionInput;
        console.log(`✅ Final answer: ${result}`);
        break;
      }
      
      try {
        // Execute the tool
        const toolResult = await this.toolHarness.executeTool(action, actionInput);
        
        // OBSERVE: Add observation to conversation history
        const observation = this.formatObservation(toolResult);
        conversationHistory.push({ 
          role: 'user', 
          content: observation 
        });
        
        console.log(`👁️ Observation: ${observation.substring(0, 100)}...`);
      } catch (error) {
        // Handle tool execution errors
        const errorObservation = `Error executing ${action}: ${error.message}`;
        conversationHistory.push({ 
          role: 'user', 
          content: errorObservation 
        });
        console.log(`❌ Tool error: ${error.message}`);
      }
    }
    
    if (!isDone) {
      result = '⚠️ Maximum iterations reached without completing the task.';
      console.log(result);
    }
    
    return result;
  }
  
  getSystemPrompt() {
    return `You are an agentic code assistant that helps users with software engineering tasks.
You have access to various tools to read, write, and modify files, execute terminal commands, and search codebases.

Your goal is to understand the user's request and accomplish it using the available tools.
You should think step by step, explaining your reasoning before taking actions.

When you need to use a tool, format your response as follows:
THOUGHT: [Your reasoning about what to do next]
ACTION: [The tool name to use]
ACTION_INPUT: [JSON object with parameters for the tool]

When you have completed the task, use:
THOUGHT: [Your final reasoning]
ACTION: final_answer
ACTION_INPUT: [The final response to show the user]

Available tools:
- file_read: Read a file's contents
- file_write: Write content to a file
- file_edit: Edit a file with specific replacements
- terminal_execute: Run a shell command
- semantic_search: Search for code using natural language
- grep_search: Search for text patterns in files
- list_directory: List files in a directory
- get_file_info: Get information about a file

Always validate your actions and check results before proceeding.`;
  }
  
  parseReasoningOutput(llmOutput) {
    // Extract thought, action, and action input from LLM output
    const thoughtMatch = llmOutput.match(/THOUGHT:\s*([\s\S]*?)(?=ACTION:|$)/i);
    const actionMatch = llmOutput.match(/ACTION:\s*([\s\S]*?)(?=ACTION_INPUT:|$)/i);
    const actionInputMatch = llmOutput.match(/ACTION_INPUT:\s*([\s\S]*)/i);
    
    const thought = thoughtMatch ? thoughtMatch[1].trim() : '';
    const action = actionMatch ? actionMatch[1].trim() : '';
    let actionInput = {};
    
    if (actionInputMatch) {
      try {
        actionInput = JSON.parse(actionInputMatch[1].trim());
      } catch (e) {
        // If JSON parsing fails, treat as plain text
        actionInput = { input: actionInputMatch[1].trim() };
      }
    }
    
    return { thought, action, actionInput };
  }
  
  formatObservation(toolResult) {
    if (toolResult.success) {
      return `Observation: ${toolResult.output}`;
    } else {
      return `Observation: Error - ${toolResult.error}`;
    }
  }
  
  async shutdown() {
    console.log('🔄 ReAct loop shut down');
  }
}