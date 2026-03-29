export class AgenticAssistant {
  constructor({ llmLayer, toolHarness, mcpManager, reactLoop, userInterface }) {
    this.llmLayer = llmLayer;
    this.toolHarness = toolHarness;
    this.mcpManager = mcpManager;
    this.reactLoop = reactLoop;
    this.userInterface = userInterface;
    this.isInitialized = false;
  }
  
  async initialize() {
    // Initialize all components
    await this.llmLayer.initialize();
    await this.toolHarness.initialize();
    await this.mcpManager.initialize();
    await this.reactLoop.initialize();
    await this.userInterface.initialize();
    
    this.isInitialized = true;
    console.log('✅ All components initialized successfully');
  }
  
  async processRequest(userInput) {
    if (!this.isInitialized) {
      throw new Error('Assistant not initialized');
    }
    
    // Process the request through the ReAct loop
    return await this.reactLoop.execute(userInput);
  }
  
  async shutdown() {
    await this.llmLayer.shutdown();
    await this.toolHarness.shutdown();
    await this.mcpManager.shutdown();
    await this.reactLoop.shutdown();
    await this.userInterface.shutdown();
    
    this.isInitialized = false;
    console.log('🔄 Assistant shut down successfully');
  }
}