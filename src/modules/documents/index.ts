// src/modules/documents/index.ts

import { DocumentsService } from './documents.service.js';
import { getDocumentsTools } from './documents.tools.js';
import { DocumentsModuleConfig } from '../../core/types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../core/logger.js';
import { DocumentType } from './documents.types.js';

export class DocumentsModule {
  private service: DocumentsService;

  constructor(
    config: DocumentsModuleConfig,
    eventBus: EventBus,
    logger: Logger,
    projectRoot?: string
  ) {
    this.service = new DocumentsService(config, eventBus, logger, projectRoot);
  }

  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  getTools() {
    return getDocumentsTools();
  }

  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case 'documents_search':
        return this.service.searchDocuments(args.query as string);

      case 'documents_find_by_type':
        return this.service.findDocumentByType(args.type as DocumentType);

      case 'documents_should_update':
        return this.service.shouldUpdateDocument(
          args.topic as string,
          args.content as string
        );

      case 'documents_update':
        return this.service.updateDocument(
          args.path as string,
          args.content as string
        );

      case 'documents_create':
        return this.service.createDocument({
          path: args.path as string,
          content: args.content as string,
          type: args.type as DocumentType | undefined,
          description: args.description as string | undefined,
          tags: args.tags as string[] | undefined,
        });

      case 'documents_register':
        return this.service.registerDocument(args.path as string);

      case 'documents_scan':
        await this.service.scanDocuments();
        return { scanned: true };

      case 'documents_list':
        return this.service.getAllDocuments();

      case 'documents_status':
        return this.service.getStatus();

      default:
        throw new Error(`Unknown documents tool: ${toolName}`);
    }
  }

  getStatus() {
    return this.service.getStatus();
  }

  async shutdown(): Promise<void> {
    // Cleanup logic if needed
  }

  // ═══════════════════════════════════════════════════════════════
  //                      WRAPPER METHODS
  // ═══════════════════════════════════════════════════════════════

  async registerDocument(path: string) {
    return this.service.registerDocument(path);
  }

  async scanDocuments() {
    return this.service.scanDocuments();
  }

  async updateDocument(path: string, content: string) {
    return this.service.updateDocument(path, content);
  }

  async searchDocuments(query: string) {
    return this.service.searchDocuments(query);
  }

  getAllDocuments() {
    return this.service.getAllDocuments();
  }
}

export { DocumentsService } from './documents.service.js';
export { getDocumentsTools } from './documents.tools.js';
export * from './documents.types.js';
