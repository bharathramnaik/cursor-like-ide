# Agentic Code Assistant

A simplified agentic code assistant inspired by Cursor's architecture, featuring a ReAct (Reason and Act) loop, specialized tools, and context management.

## Features

- 🤖 **ReAct Loop**: Reasoning and acting cycle for autonomous task completion
- 🔧 **Specialized Tools**: File operations, terminal commands, search capabilities
- 🗄️ **Context Management**: File watching and context caching
- 💬 **Natural Language Interface**: Interact using plain English commands
- 📊 **Modular Architecture**: Easy to extend and customize

## Architecture Overview

The system follows Cursor's layered architecture:

1. **User Interface**: CLI-based interaction layer
2. **ReAct Loop**: Core reasoning and acting mechanism
3. **Tool Harness**: Specialized tools for file operations, search, and execution
4. **MCP Manager**: Context management and file watching system
5. **LLM Abstraction Layer**: Interface to language models

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd agentic-code-assistant

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env to add your API keys
```

## Usage

```bash
# Start the application
npm start

# Or in development mode
npm run dev
```

Once running, you can interact with the agent using natural language:

```
agentic> Create a new JavaScript file called hello.js that prints 'Hello World'
agentic> Read the contents of package.json
agentic> Find all files containing the word 'function'
agentic> Edit the file index.js to replace 'console.log' with 'logger.info'
```

Special commands:
- `/help` - Show available commands
- `/clear` - Clear screen and show banner
- `/status` - Show system status
- `/exit` or `/quit` - Exit the application

## Configuration

Edit the `.env` file to configure:

- `LLM_PROVIDER`: The LLM provider to use (openai, anthropic, local)
- `LLM_API_KEY`: API key for the LLM provider
- `LLM_MODEL`: Specific model to use
- `NODE_ENV`: Environment (development/production)

## Project Structure

```
agentic-code-assistant/
├── src/
│   ├── index.js              # Application entry point
│   ├── agentic-assistant.js  # Main assistant orchestrator
│   ├── agents/
│   │   └── react-loop.js     # ReAct reasoning and acting loop
│   ├── tools/
│   │   ├── tool-harness.js   # Tool execution and management
│   │   └── tool-types.js     # Tool schemas and result types
│   ├── context/
│   │   └── mcp-manager.js    # Context management and file watching
│   ├── llm/
│   │   └── llm-abstraction.js # LLM provider abstraction
│   └── ui/
│       └── user-interface.js # User interaction layer
├── .env.example              # Environment variables template
├── package.json              # Project dependencies and scripts
└── README.md                 # This file
```

## How It Works

1. **User Input**: You type a request in natural language
2. **ReAct Loop**: The agent reasons about what to do:
   - **Thought**: Analyzes the request and plans next steps
   - **Action**: Selects and executes appropriate tools
   - **Observation**: Reviews results and adjusts approach
3. **Tool Execution**: Specialized tools perform the requested operations
4. **Context Management**: File watching keeps the agent aware of changes
5. **Response**: Results are formatted and returned to you

## Extending the System

To add new tools:
1. Add the tool schema to `tool-types.js`
2. Implement the tool function in `tool-harness.js`
3. The ReAct loop will automatically recognize and use the new tool

To change the LLM provider:
1. Modify the `LLM_PROVIDER` in `.env`
2. Extend the `LLMAbstractionLayer` class in `llm-abstraction.js`

## Limitations (Demo Version)

This is a simplified implementation for educational purposes:

- Uses mock LLM responses by default (set `LLM_PROVIDER=openai` and add API key for real AI)
- Semantic search is simplified (uses text matching instead of embeddings)
- No actual MCP (Model Context Protocol) integration
- Limited error handling and edge case management

## License

MIT