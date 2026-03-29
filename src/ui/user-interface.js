import readline from 'readline';
import { chalk } from 'chalk';
import figlet from 'figlet';

export class UserInterface {
  constructor(reactLoop) {
    this.reactLoop = reactLoop;
    this.rl = null;
    this.isRunning = false;
  }
  
  async initialize() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'agentic> '
    });
    
    this.setupEventListeners();
    this.isRunning = true;
    console.log('🖥️ User Interface initialized');
    return true;
  }
  
  setupEventListeners() {
    this.rl.on('line', async (input) => {
      await this.handleUserInput(input.trim());
    });
    
    this.rl.on('close', () => {
      this.isRunning = false;
      console.log('\n👋 Goodbye!');
    });
  }
  
  async handleUserInput(input) {
    if (!input) {
      this.rl.prompt();
      return;
    }
    
    // Handle special commands
    if (input.startsWith('/')) {
      await this.handleCommand(input);
      this.rl.prompt();
      return;
    }
    
    // Process regular input through the ReAct loop
    try {
      console.log('\n🤔 Thinking...');
      const result = await this.reactLoop.execute(input);
      console.log(`\n💡 Result:\n${result}\n`);
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
    
    this.rl.prompt();
  }
  
  async handleCommand(command) {
    const parts = command.slice(1).split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (cmd) {
      case 'help':
        this.showHelp();
        break;
      case 'clear':
        console.clear();
        this.showBanner();
        break;
      case 'exit':
      case 'quit':
        this.rl.close();
        break;
      case 'status':
        await this.showStatus();
        break;
      case 'model':
        if (args[0]) {
          console.log(`🔧 Model setting would be changed to: ${args[0]} (not implemented in this demo)`);
        } else {
          console.log('🔧 Current model: gpt-4-turbo-preview (from config)');
        }
        break;
      default:
        console.log(`❓ Unknown command: ${cmd}. Type /help for available commands.`);
    }
  }
  
  showHelp() {
    const helpText = `
Available Commands:
  /help          - Show this help message
  /clear         - Clear the screen and show banner
  /exit, /quit   - Exit the application
  /status        - Show system status
  /model [name]  - Show or change the LLM model (demo only)

Instructions:
  Simply type your request in natural language and press Enter.
  The agent will use its tools to help you with coding tasks.

Examples:
  "Create a new JavaScript file called hello.js that prints 'Hello World'"
  "Read the contents of package.json"
  "Find all files containing the word 'function'"
  "Edit the file index.js to replace 'console.log' with 'logger.info'"
`;
    console.log(helpText);
  }
  
  async showStatus() {
    try {
      // In a real implementation, we would get status from all components
      console.log(`
System Status:
  🟢 User Interface: Running
  🟢 ReAct Loop: Ready
  🟢 Tool Harness: Initialized (8 tools available)
  🟢 MCP Manager: Active (watching for file changes)
  🟢 LLM Layer: ${process.env.LLM_PROVIDER || 'openai'}:${process.env.LLM_MODEL || 'gpt-4-turbo-preview'}
  💻 Working Directory: ${process.cwd()}
`);
    } catch (error) {
      console.error(`❌ Failed to get status: ${error.message}`);
    }
  }
  
  showBanner() {
    figlet('Agentic Code\nAssistant', (err, data) => {
      if (err) {
        console.log('🚀 Agentic Code Assistant');
        return;
      }
      console.log(chalk.cyan(data));
      console.log(chalk.dim('A simplified agentic code assistant inspired by Cursor\n'));
    });
  }
  
  async start() {
    this.showBanner();
    this.rl.prompt();
  }
  
  async shutdown() {
    if (this.rl) {
      this.rl.close();
    }
    this.isRunning = false;
    console.log('🖥️ User Interface shut down');
  }
}