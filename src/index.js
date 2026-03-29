#!/usr/bin/env node

import { AgenticAssistant } from './agentic-assistant.js';
import { MCPManager } from './context/mcp-manager.js';
import { LLMAbstractionLayer } from './llm/llm-abstraction.js';
import { UserInterface } from './ui/user-interface.js';
import { ToolHarness } from './tools/tool-harness.js';
import { ReActLoop } from './agents/react-loop.js';
import dotenv from 'dotenv';

dotenv.config();

async function initializeAssistant() {
  console.log('🚀 Initializing Agentic Code Assistant...');
  
  // Initialize core components
  const llmLayer = new LLMAbstractionLayer({
    provider: process.env.LLM_PROVIDER || 'openai',
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL || 'gpt-4-turbo-preview'
  });
  
  const toolHarness = new ToolHarness();
  const mcpManager = new MCPManager();
  const reactLoop = new ReActLoop(llmLayer, toolHarness, mcpManager);
  const userInterface = new UserInterface(reactLoop);
  
  // Initialize the main assistant
  const assistant = new AgenticAssistant({
    llmLayer,
    toolHarness,
    mcpManager,
    reactLoop,
    userInterface
  });
  
  await assistant.initialize();
  await userInterface.start();
  
  return assistant;
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the application
initializeAssistant()
  .then(assistant => {
    console.log('✨ Agentic Code Assistant is ready!');
    console.log('💡 Type your requests or use /help for available commands');
  })
  .catch(error => {
    console.error('❌ Failed to initialize assistant:', error);
    process.exit(1);
  });