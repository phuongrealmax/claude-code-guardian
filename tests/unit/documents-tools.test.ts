// tests/unit/documents-tools.test.ts

// Using vitest globals
import { getDocumentsTools } from '../../src/modules/documents/documents.tools.js';

describe('documents.tools', () => {
  // ═══════════════════════════════════════════════════════════════
  //                      getDocumentsTools
  // ═══════════════════════════════════════════════════════════════

  describe('getDocumentsTools', () => {
    it('should return an array of tool definitions', () => {
      const tools = getDocumentsTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include all required documents tools', () => {
      const tools = getDocumentsTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('documents_search');
      expect(toolNames).toContain('documents_find_by_type');
      expect(toolNames).toContain('documents_should_update');
      expect(toolNames).toContain('documents_update');
      expect(toolNames).toContain('documents_create');
      expect(toolNames).toContain('documents_register');
      expect(toolNames).toContain('documents_scan');
      expect(toolNames).toContain('documents_list');
      expect(toolNames).toContain('documents_status');
    });

    it('should have valid inputSchema structure for all tools', () => {
      const tools = getDocumentsTools();

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SEARCH TOOL SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('documents_search schema', () => {
    it('should have query as required', () => {
      const tools = getDocumentsTools();
      const searchTool = tools.find(t => t.name === 'documents_search');

      expect(searchTool).toBeDefined();
      expect(searchTool!.inputSchema.required).toContain('query');
      expect(searchTool!.inputSchema.properties).toHaveProperty('query');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      FIND BY TYPE SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('documents_find_by_type schema', () => {
    it('should have type as required', () => {
      const tools = getDocumentsTools();
      const findTool = tools.find(t => t.name === 'documents_find_by_type');

      expect(findTool).toBeDefined();
      expect(findTool!.inputSchema.required).toContain('type');
    });

    it('should have type enum with document types', () => {
      const tools = getDocumentsTools();
      const findTool = tools.find(t => t.name === 'documents_find_by_type');
      const typeProp = findTool!.inputSchema.properties.type as { enum: string[] };

      expect(typeProp.enum).toContain('readme');
      expect(typeProp.enum).toContain('spec');
      expect(typeProp.enum).toContain('api');
      expect(typeProp.enum).toContain('guide');
      expect(typeProp.enum).toContain('changelog');
      expect(typeProp.enum).toContain('architecture');
      expect(typeProp.enum).toContain('config');
      expect(typeProp.enum).toContain('other');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      SHOULD UPDATE SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('documents_should_update schema', () => {
    it('should have topic and content as required', () => {
      const tools = getDocumentsTools();
      const updateCheckTool = tools.find(t => t.name === 'documents_should_update');

      expect(updateCheckTool).toBeDefined();
      expect(updateCheckTool!.inputSchema.required).toContain('topic');
      expect(updateCheckTool!.inputSchema.required).toContain('content');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      UPDATE TOOL SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('documents_update schema', () => {
    it('should have path and content as required', () => {
      const tools = getDocumentsTools();
      const updateTool = tools.find(t => t.name === 'documents_update');

      expect(updateTool).toBeDefined();
      expect(updateTool!.inputSchema.required).toContain('path');
      expect(updateTool!.inputSchema.required).toContain('content');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      CREATE TOOL SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('documents_create schema', () => {
    it('should have path and content as required', () => {
      const tools = getDocumentsTools();
      const createTool = tools.find(t => t.name === 'documents_create');

      expect(createTool).toBeDefined();
      expect(createTool!.inputSchema.required).toContain('path');
      expect(createTool!.inputSchema.required).toContain('content');
    });

    it('should have optional type with enum', () => {
      const tools = getDocumentsTools();
      const createTool = tools.find(t => t.name === 'documents_create');
      const typeProp = createTool!.inputSchema.properties.type as { enum: string[] };

      expect(typeProp.enum).toContain('readme');
      expect(typeProp.enum).toContain('spec');
      expect(typeProp.enum).toContain('api');
      expect(typeProp.enum).toContain('guide');
      expect(typeProp.enum).toContain('changelog');
      expect(typeProp.enum).toContain('architecture');
      expect(typeProp.enum).toContain('config');
      expect(typeProp.enum).toContain('other');
    });

    it('should have optional description and tags', () => {
      const tools = getDocumentsTools();
      const createTool = tools.find(t => t.name === 'documents_create');

      expect(createTool!.inputSchema.properties).toHaveProperty('description');
      expect(createTool!.inputSchema.properties).toHaveProperty('tags');
      // description and tags should not be required
      expect(createTool!.inputSchema.required).not.toContain('description');
      expect(createTool!.inputSchema.required).not.toContain('tags');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      REGISTER TOOL SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('documents_register schema', () => {
    it('should have path as required', () => {
      const tools = getDocumentsTools();
      const registerTool = tools.find(t => t.name === 'documents_register');

      expect(registerTool).toBeDefined();
      expect(registerTool!.inputSchema.required).toContain('path');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS TOOLS SCHEMAS
  // ═══════════════════════════════════════════════════════════════

  describe('status tools schemas', () => {
    it('should have no required fields for scan', () => {
      const tools = getDocumentsTools();
      const scanTool = tools.find(t => t.name === 'documents_scan');

      expect(scanTool).toBeDefined();
      expect(scanTool!.inputSchema.required).toEqual([]);
      expect(Object.keys(scanTool!.inputSchema.properties)).toHaveLength(0);
    });

    it('should have no required fields for list', () => {
      const tools = getDocumentsTools();
      const listTool = tools.find(t => t.name === 'documents_list');

      expect(listTool).toBeDefined();
      expect(listTool!.inputSchema.required).toEqual([]);
      expect(Object.keys(listTool!.inputSchema.properties)).toHaveLength(0);
    });

    it('should have no required fields for status', () => {
      const tools = getDocumentsTools();
      const statusTool = tools.find(t => t.name === 'documents_status');

      expect(statusTool).toBeDefined();
      expect(statusTool!.inputSchema.required).toEqual([]);
      expect(Object.keys(statusTool!.inputSchema.properties)).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      TOOL COUNT
  // ═══════════════════════════════════════════════════════════════

  describe('tool count', () => {
    it('should have exactly 9 tools', () => {
      const tools = getDocumentsTools();

      expect(tools.length).toBe(9);
    });
  });
});
