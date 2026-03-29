export class ToolResult {
  constructor(success, output, error = null) {
    this.success = success;
    this.output = output;
    this.error = error;
  }
  
  static success(output) {
    return new ToolResult(true, output);
  }
  
  static error(error) {
    return new ToolResult(false, null, error);
  }
}

export const ToolSchema = {
  file_read: {
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the file to read'
        }
      },
      required: ['filePath']
    }
  },
  file_write: {
    description: 'Write content to a file',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the file to write'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        }
      },
      required: ['filePath', 'content']
    }
  },
  file_edit: {
    description: 'Edit a file by replacing specific text',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the file to edit'
        },
        oldString: {
          type: 'string',
          description: 'The text to replace'
        },
        newString: {
          type: 'string',
          description: 'The text to replace it with'
        },
        replaceAll: {
          type: 'boolean',
          description: 'Replace all occurrences (default: false)',
          default: false
        }
      },
      required: ['filePath', 'oldString', 'newString']
    }
  },
  terminal_execute: {
    description: 'Execute a shell command',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute'
        },
        workdir: {
          type: 'string',
          description: 'Working directory for the command (optional)',
          default: '.'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (optional)',
          default: 30000
        }
      },
      required: ['command']
    }
  },
  semantic_search: {
    description: 'Search for code using natural language',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query'
        },
        path: {
          type: 'string',
          description: 'Directory to search in (optional)',
          default: '.'
        }
      },
      required: ['query']
    }
  },
  grep_search: {
    description: 'Search for text patterns in files using regex',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regex pattern to search for'
        },
        path: {
          type: 'string',
          description: 'Directory to search in (optional)',
          default: '.'
        },
        include: {
          type: 'string',
          description: 'File pattern to include (e.g. \"*.js\") (optional)'
        }
      },
      required: ['pattern']
    }
  },
  list_directory: {
    description: 'List files and directories in a path',
    parameters: {
      type: 'object',
      properties: {
        directoryPath: {
          type: 'string',
          description: 'Absolute path to the directory to list'
        }
      },
      required: ['directoryPath']
    }
  },
  get_file_info: {
    description: 'Get information about a file',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path to the file'
        }
      },
      required: ['filePath']
    }
  }
};