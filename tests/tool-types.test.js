import { ToolResult, ToolSchema } from '../src/tools/tool-types.js';

describe('ToolResult', () => {
  describe('success', () => {
    it('should create a successful result', () => {
      const result = ToolResult.success('Test output');
      expect(result.success).toBe(true);
      expect(result.output).toBe('Test output');
      expect(result.error).toBeNull();
    });
  });

  describe('error', () => {
    it('should create an error result', () => {
      const result = ToolResult.error('Error message');
      expect(result.success).toBe(false);
      expect(result.output).toBeNull();
      expect(result.error).toBe('Error message');
    });
  });
});

describe('ToolSchema', () => {
  it('should have file_read tool defined', () => {
    expect(ToolSchema.file_read).toBeDefined();
    expect(ToolSchema.file_read.description).toBeTruthy();
  });

  it('should have file_write tool defined', () => {
    expect(ToolSchema.file_write).toBeDefined();
    expect(ToolSchema.file_write.parameters.required).toContain('filePath');
  });

  it('should have file_edit tool defined', () => {
    expect(ToolSchema.file_edit).toBeDefined();
    expect(ToolSchema.file_edit.parameters.required).toContain('filePath');
  });

  it('should have terminal_execute tool defined', () => {
    expect(ToolSchema.terminal_execute).toBeDefined();
    expect(ToolSchema.terminal_execute.parameters.required).toContain('command');
  });

  it('should have semantic_search tool defined', () => {
    expect(ToolSchema.semantic_search).toBeDefined();
    expect(ToolSchema.semantic_search.parameters.required).toContain('query');
  });

  it('should have grep_search tool defined', () => {
    expect(ToolSchema.grep_search).toBeDefined();
    expect(ToolSchema.grep_search.parameters.required).toContain('pattern');
  });

  it('should have list_directory tool defined', () => {
    expect(ToolSchema.list_directory).toBeDefined();
    expect(ToolSchema.list_directory.parameters.required).toContain('directoryPath');
  });

  it('should have get_file_info tool defined', () => {
    expect(ToolSchema.get_file_info).toBeDefined();
    expect(ToolSchema.get_file_info.parameters.required).toContain('filePath');
  });
});