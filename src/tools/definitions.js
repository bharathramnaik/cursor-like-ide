/**
 * Tool Definitions
 * Complete set of tools matching Cursor's functionality
 */

export const TOOL_DEFINITIONS = {
  // File Operations
  file_read: {
    description: 'Read the contents of a file from the filesystem',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the file' },
        offset: { type: 'number', description: 'Line number to start reading from' },
        limit: { type: 'number', description: 'Maximum number of lines to read' }
      },
      required: ['filePath']
    }
  },

  file_write: {
    description: 'Create a new file or completely overwrite an existing one',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path of the file to create' },
        content: { type: 'string', description: 'Content to write to the file' }
      },
      required: ['filePath', 'content']
    }
  },

  file_edit: {
    description: 'Edit a file by replacing specific text with new content',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the file' },
        oldString: { type: 'string', description: 'The exact text to replace' },
        newString: { type: 'string', description: 'The replacement text' },
        replaceAll: { type: 'boolean', description: 'Replace all occurrences', default: false }
      },
      required: ['filePath', 'oldString', 'newString']
    }
  },

  file_delete: {
    description: 'Delete a file from the filesystem',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the file to delete' }
      },
      required: ['filePath']
    }
  },

  file_replace: {
    description: 'Perform a multi-step search and replace in a file',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the file' },
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              find: { type: 'string' },
              replace: { type: 'string' }
            }
          },
          description: 'Array of find/replace operations'
        }
      },
      required: ['filePath', 'operations']
    }
  },

  // Glob and Search
  glob: {
    description: 'Find files matching a pattern using glob syntax',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g., "src/**/*.ts")' },
        path: { type: 'string', description: 'Root directory to search from' }
      },
      required: ['pattern']
    }
  },

  grep: {
    description: 'Search for text patterns using regular expressions',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regular expression to search for' },
        path: { type: 'string', description: 'Directory to search in' },
        include: { type: 'string', description: 'File pattern to include (e.g., "*.js")' },
        exclude: { type: 'string', description: 'File pattern to exclude' },
        contextLines: { type: 'number', description: 'Number of context lines to include', default: 3 }
      },
      required: ['pattern']
    }
  },

  semantic_search: {
    description: 'Search for code using natural language (uses embeddings)',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        path: { type: 'string', description: 'Directory to search in' }
      },
      required: ['query']
    }
  },

  find_symbol: {
    description: 'Find function, class, or variable definitions',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Symbol name to search for' },
        type: { type: 'string', enum: ['function', 'class', 'variable', 'all'], description: 'Type of symbol' }
      },
      required: ['name']
    }
  },

  // Terminal / Shell Operations
  terminal: {
    description: 'Execute a shell command in the terminal',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        workdir: { type: 'string', description: 'Working directory for command' },
        timeout: { type: 'number', description: 'Timeout in milliseconds', default: 60000 },
        environment: { type: 'object', description: 'Environment variables to set' }
      },
      required: ['command']
    }
  },

  npm_install: {
    description: 'Install npm dependencies',
    parameters: {
      type: 'object',
      properties: {
        packages: { type: 'array', items: { type: 'string' }, description: 'Package names to install' },
        workdir: { type: 'string', description: 'Project directory' },
        dev: { type: 'boolean', description: 'Install as dev dependency', default: false },
        saveExact: { type: 'boolean', description: 'Save with exact versions', default: false }
      },
      required: ['packages']
    }
  },

  npm_run: {
    description: 'Run an npm script from package.json',
    parameters: {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'Script name from package.json' },
        workdir: { type: 'string', description: 'Project directory' }
      },
      required: ['script']
    }
  },

  // Testing
  test: {
    description: 'Run project tests using appropriate test runner',
    parameters: {
      type: 'object',
      properties: {
        testFramework: { type: 'string', enum: ['jest', 'vitest', 'pytest', 'go test', 'cargo test'], description: 'Test framework to use' },
        pattern: { type: 'string', description: 'Test pattern to match' },
        workdir: { type: 'string', description: 'Project directory' },
        watch: { type: 'boolean', description: 'Run in watch mode', default: false }
      }
    }
  },

  // Linting
  linter: {
    description: 'Run code linter to check for issues',
    parameters: {
      type: 'object',
      properties: {
        linter: { type: 'string', enum: ['eslint', 'prettier', 'ruff', 'golangci-lint'], description: 'Linter to run' },
        fix: { type: 'boolean', description: 'Automatically fix issues', default: false },
        workdir: { type: 'string', description: 'Project directory' }
      }
    }
  },

  // Build
  build: {
    description: 'Build the project',
    parameters: {
      type: 'object',
      properties: {
        tool: { type: 'string', enum: ['npm', 'make', 'cargo', 'gradle', 'cmake'], description: 'Build tool' },
        target: { type: 'string', description: 'Build target' },
        workdir: { type: 'string', description: 'Project directory' }
      }
    }
  },

  // Git Operations
  git_diff: {
    description: 'Show git diff for changes',
    parameters: {
      type: 'object',
      properties: {
        staged: { type: 'boolean', description: 'Show only staged changes', default: false },
        target: { type: 'string', description: 'Branch or commit to compare against' },
        path: { type: 'string', description: 'Path to filter diff to specific files' }
      }
    }
  },

  git_status: {
    description: 'Show git status',
    parameters: {
      type: 'object',
      properties: {
        short: { type: 'boolean', description: 'Use short format', default: false }
      }
    }
  },

  git_commit: {
    description: 'Commit staged changes',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
        author: { type: 'string', description: 'Author name and email' }
      },
      required: ['message']
    }
  },

  git_branch: {
    description: 'List, create, or delete branches',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'delete', 'checkout'], description: 'Action to perform' },
        branchName: { type: 'string', description: 'Name of branch' }
      }
    }
  },

  // Browser Operations (UI Testing)
  browse: {
    description: 'Open a URL in a headless browser for testing',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['open', 'click', 'type', 'screenshot', 'wait'], description: 'Browser action' },
        url: { type: 'string', description: 'URL to open' },
        selector: { type: 'string', description: 'CSS selector for click/type' },
        text: { type: 'string', description: 'Text to type' },
        timeout: { type: 'number', description: 'Wait timeout in ms' }
      },
      required: ['action']
    }
  },

  // Code Review
  review: {
    description: 'Review code changes for issues',
    parameters: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['diff', 'file', 'patch'], description: 'Scope of review' },
        checks: { type: 'array', items: { type: 'string' }, description: 'Specific checks to run' }
      }
    }
  }

  // Final Answer (not a tool, but used by agent to respond)
  final_answer: {
    description: 'Provide final answer to the user when task is complete',
    parameters: {
      type: 'object',
      properties: {
        response: { type: 'string', description: 'Final response to user' }
      },
      required: ['response']
    }
  }
};

export const DEFAULT_TOOLS = [
  'file_read',
  'file_write', 
  'file_edit',
  'file_delete',
  'glob',
  'grep',
  'semantic_search',
  'find_symbol',
  'terminal',
  'git_diff',
  'git_status',
  'git_commit',
  'final_answer'
];