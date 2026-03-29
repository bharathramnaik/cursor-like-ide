# CursorLike IDE

A Cursor-like AI-powered IDE built with the **exact same tech stack** as Cursor.

## Tech Stack (Same as Cursor)

| Component | Technology |
|-----------|------------|
| Editor Framework | Electron 28+ |
| Language | TypeScript |
| Backend | TypeScript + Node.js |
| AI Models | OpenAI, Anthropic Claude |
| Logging | electron-log |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/bharathramnaik/cursor-like-ide.git
cd cursor-like-ide

# Install dependencies
npm install
```

### Run in Development

```bash
# Start Electron app
npm start

# Or use development mode
npm run dev
```

### Build

```bash
npm run build
```

## Features

- **VS Code-like Editor** - Full Electron-based IDE with dark theme
- **AI Integration** - OpenAI GPT-4 and Anthropic Claude support
- **Agentic Workflow** - ReAct loop for autonomous task completion
- **Tool System** - File operations, terminal commands, git integration
- **Ctrl+K Command Palette** - Quick AI assistant access
- **TypeScript** - Type-safe implementation matching Cursor's architecture

## Architecture

```
src/
├── main/
│   └── main.ts           # Electron main process
├── preload/
│   └── preload.ts        # Secure bridge to renderer
├── renderer/
│   └── index.html        # IDE UI (VS Code-like)
├── agents/
│   └── react-agent.ts    # ReAct reasoning loop
├── tools/
│   └── tool-registry.ts  # Tool definitions & execution
└── llm/
    └── llm-interface.ts  # LLM provider abstraction
```

## Comparison with Original Cursor

| Feature | Cursor | CursorLike IDE |
|---------|--------|----------------|
| Editor | VS Code fork | Electron (simplified) |
| Language | TypeScript + Rust | TypeScript |
| AI Models | Custom Composer + frontier models | OpenAI/Anthropic |
| Tab Autocomplete | Speculative decoding | Via API |
| Context Engine | Merkle tree + vector store | File watching |
| Agent System | Multi-agent orchestration | ReAct loop |

## License

MIT

## Author

Bharath Ram Naiks