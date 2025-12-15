// tests/unit/documents.test.ts

// Using vitest globals
import { DocumentsService } from '../../src/modules/documents/documents.service.js';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const mockEventBus = new EventBus();
const mockLogger = new Logger('silent');

const createTestConfig = (overrides = {}) => ({
  enabled: true,
  locations: {
    docs: 'docs',
    api: 'docs/api',
  },
  updateInsteadOfCreate: true,
  ...overrides,
});

describe('DocumentsService', () => {
  let service: DocumentsService;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-documents-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create test directory structure
    fs.mkdirSync(path.join(testDir, '.ccg', 'registry'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'docs'), { recursive: true });

    service = new DocumentsService(
      createTestConfig(),
      mockEventBus,
      mockLogger,
      testDir
    );
    await service.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //                      INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(service).toBeDefined();
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new DocumentsService(
        createTestConfig({ enabled: false }),
        mockEventBus,
        mockLogger,
        testDir
      );
      await disabledService.initialize();
      expect(disabledService.getStatus().enabled).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DOCUMENT REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  describe('registerDocument', () => {
    it('should register a document', async () => {
      const docPath = path.join(testDir, 'docs', 'test.md');
      fs.writeFileSync(docPath, '# Test Document\n\nThis is a test document.');

      const doc = await service.registerDocument(docPath);

      expect(doc.id).toBeDefined();
      expect(doc.path).toBe(docPath);
      expect(doc.name).toBe('test.md');
      expect(doc.type).toBeDefined();
    });

    it('should detect document type from filename', async () => {
      const readmePath = path.join(testDir, 'README.md');
      fs.writeFileSync(readmePath, '# Project README');

      const doc = await service.registerDocument(readmePath);

      expect(doc.type).toBe('readme');
    });

    it('should detect changelog type', async () => {
      const changelogPath = path.join(testDir, 'CHANGELOG.md');
      fs.writeFileSync(changelogPath, '# Changelog');

      const doc = await service.registerDocument(changelogPath);

      expect(doc.type).toBe('changelog');
    });

    it('should detect API document type', async () => {
      const apiPath = path.join(testDir, 'docs', 'api-reference.md');
      fs.writeFileSync(apiPath, '# API Reference');

      const doc = await service.registerDocument(apiPath);

      expect(doc.type).toBe('api');
    });

    it('should extract description from content', async () => {
      const docPath = path.join(testDir, 'docs', 'guide.md');
      fs.writeFileSync(docPath, '# Guide\n\nThis is the description line.\n\n## Section');

      const doc = await service.registerDocument(docPath);

      expect(doc.description).toContain('description line');
    });

    it('should extract tags from headers', async () => {
      const docPath = path.join(testDir, 'docs', 'tagged.md');
      fs.writeFileSync(docPath, '# Tagged Doc\n\n## Installation\n\n## Usage');

      const doc = await service.registerDocument(docPath);

      expect(doc.tags).toContain('installation');
      expect(doc.tags).toContain('usage');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DOCUMENT SEARCH
  // ═══════════════════════════════════════════════════════════════

  describe('searchDocuments', () => {
    beforeEach(async () => {
      // Create test documents
      fs.writeFileSync(path.join(testDir, 'docs', 'guide.md'), '# User Guide\n\nHow to use the app.');
      fs.writeFileSync(path.join(testDir, 'docs', 'api.md'), '# API Reference\n\nAPI documentation.');
      await service.scanDocuments();
    });

    it('should find documents by name', () => {
      const results = service.searchDocuments('guide');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.name).toContain('guide');
    });

    it('should find documents by description', () => {
      const results = service.searchDocuments('documentation');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const results = service.searchDocuments('xyznonexistent');

      expect(results.length).toBe(0);
    });

    it('should sort results by relevance', () => {
      const results = service.searchDocuments('api');

      if (results.length > 1) {
        expect(results[0].relevance).toBeGreaterThanOrEqual(results[1].relevance);
      }
    });
  });

  describe('findDocumentByType', () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, 'docs', 'api-ref.md'), '# API');
      fs.writeFileSync(path.join(testDir, 'docs', 'guide.md'), '# Guide');
      await service.scanDocuments();
    });

    it('should find documents by type', () => {
      // Register an API document
      const apiDocs = service.findDocumentByType('api');

      expect(Array.isArray(apiDocs)).toBe(true);
    });
  });

  describe('findDocumentByPath', () => {
    it('should find document by exact path', async () => {
      const docPath = path.join(testDir, 'docs', 'test.md');
      fs.writeFileSync(docPath, '# Test');
      await service.registerDocument(docPath);

      const doc = service.findDocumentByPath(docPath);

      expect(doc).toBeDefined();
      expect(doc!.path).toBe(docPath);
    });

    it('should find document by partial path', async () => {
      const docPath = path.join(testDir, 'docs', 'partial.md');
      fs.writeFileSync(docPath, '# Partial');
      await service.registerDocument(docPath);

      // Use path.sep for cross-platform compatibility
      const doc = service.findDocumentByPath(`docs${path.sep}partial.md`);

      expect(doc).toBeDefined();
    });

    it('should return undefined for non-existent path', () => {
      const doc = service.findDocumentByPath('/nonexistent/path.md');

      expect(doc).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DOCUMENT UPDATE
  // ═══════════════════════════════════════════════════════════════

  describe('shouldUpdateDocument', () => {
    it('should suggest create when no matching document', () => {
      const result = service.shouldUpdateDocument('brand new topic', 'New content');

      expect(result.suggestedAction).toBe('create');
    });

    it('should suggest update when matching document found', async () => {
      const docPath = path.join(testDir, 'docs', 'existing.md');
      fs.writeFileSync(docPath, '# Existing Topic\n\nExisting content.');
      await service.registerDocument(docPath);

      const result = service.shouldUpdateDocument('existing topic', 'Updated content');

      expect(result.suggestedAction).toBe('update');
      expect(result.existingContent).toContain('Existing');
    });
  });

  describe('updateDocument', () => {
    it('should update document content', async () => {
      const docPath = path.join(testDir, 'docs', 'update.md');
      fs.writeFileSync(docPath, '# Original');
      await service.registerDocument(docPath);

      const doc = await service.updateDocument(docPath, '# Updated Content');

      expect(fs.readFileSync(docPath, 'utf-8')).toContain('Updated');
      expect(doc.path).toBe(docPath);
    });
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const newPath = path.join(testDir, 'docs', 'new', 'nested.md');

      const doc = await service.createDocument({
        path: newPath,
        content: '# New Document',
        type: 'guide',
        tags: ['new', 'test'],
      });

      expect(fs.existsSync(newPath)).toBe(true);
      expect(doc.type).toBe('guide');
      expect(doc.tags).toContain('new');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      DOCUMENT SCANNING
  // ═══════════════════════════════════════════════════════════════

  describe('scanDocuments', () => {
    it('should find README in root', async () => {
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Project');

      await service.scanDocuments();
      const docs = service.getAllDocuments();

      expect(docs.some(d => d.name === 'README.md')).toBe(true);
    });

    it('should scan docs directory', async () => {
      fs.writeFileSync(path.join(testDir, 'docs', 'setup.md'), '# Setup');

      await service.scanDocuments();
      const docs = service.getAllDocuments();

      expect(docs.some(d => d.name === 'setup.md')).toBe(true);
    });

    it('should ignore node_modules', async () => {
      fs.mkdirSync(path.join(testDir, 'node_modules', 'pkg'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'node_modules', 'pkg', 'README.md'), '# Package');

      await service.scanDocuments();
      const docs = service.getAllDocuments();

      expect(docs.some(d => d.path.includes('node_modules'))).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //                      STATUS
  // ═══════════════════════════════════════════════════════════════

  describe('getStatus', () => {
    it('should return module status', () => {
      const status = service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.documentCount).toBeGreaterThanOrEqual(0);
      expect(status.byType).toBeDefined();
      expect(status.lastScanned).toBeDefined();
    });
  });

  describe('getAllDocuments', () => {
    it('should return all registered documents', async () => {
      fs.writeFileSync(path.join(testDir, 'docs', 'doc1.md'), '# Doc 1');
      fs.writeFileSync(path.join(testDir, 'docs', 'doc2.md'), '# Doc 2');
      await service.scanDocuments();

      const docs = service.getAllDocuments();

      expect(docs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
