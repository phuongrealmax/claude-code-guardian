// tests/helpers/fixtures/ragDocs.ts

import type { CodeChunk } from '../../../src/modules/rag/rag.types.js';

const NOW = new Date('2025-01-01T00:00:00Z');

/**
 * Sample code chunks for testing RAG service
 */
export const sampleChunks: CodeChunk[] = [
  {
    id: 'chunk-1',
    filePath: 'src/utils/auth.ts',
    name: 'validateToken',
    type: 'function',
    language: 'typescript',
    startLine: 10,
    endLine: 25,
    content: `export function validateToken(token: string): boolean {
  if (!token) return false;
  const decoded = decodeJWT(token);
  return decoded.exp > Date.now() / 1000;
}`,
    signature: 'validateToken(token: string): boolean',
    docstring: 'Validates a JWT token',
    imports: ['decodeJWT'],
    hash: 'hash-chunk-1',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'chunk-2',
    filePath: 'src/utils/auth.ts',
    name: 'hashPassword',
    type: 'function',
    language: 'typescript',
    startLine: 30,
    endLine: 40,
    content: `export async function hashPassword(password: string): Promise<string> {
  const salt = await generateSalt();
  return bcrypt.hash(password, salt);
}`,
    signature: 'hashPassword(password: string): Promise<string>',
    docstring: 'Hashes a password using bcrypt',
    imports: ['bcrypt', 'generateSalt'],
    hash: 'hash-chunk-2',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'chunk-3',
    filePath: 'src/services/user.service.ts',
    name: 'UserService',
    type: 'class',
    language: 'typescript',
    startLine: 1,
    endLine: 50,
    content: `export class UserService {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    return this.db.users.findOne({ id });
  }

  async create(data: CreateUserDTO): Promise<User> {
    const hashed = await hashPassword(data.password);
    return this.db.users.create({ ...data, password: hashed });
  }
}`,
    signature: 'class UserService',
    docstring: 'Service for user management',
    imports: ['Database', 'User', 'CreateUserDTO', 'hashPassword'],
    hash: 'hash-chunk-3',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'chunk-4',
    filePath: 'src/api/routes.ts',
    name: 'authMiddleware',
    type: 'function',
    language: 'typescript',
    startLine: 5,
    endLine: 20,
    content: `export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!validateToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}`,
    signature: 'authMiddleware(req, res, next)',
    docstring: 'Express middleware for JWT authentication',
    imports: ['Request', 'Response', 'NextFunction', 'validateToken'],
    hash: 'hash-chunk-4',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'chunk-5',
    filePath: 'src/utils/logger.py',
    name: 'setup_logging',
    type: 'function',
    language: 'python',
    startLine: 1,
    endLine: 15,
    content: `def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configure application logging."""
    logger = logging.getLogger("app")
    logger.setLevel(getattr(logging, level))
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
    logger.addHandler(handler)
    return logger`,
    signature: 'setup_logging(level: str = "INFO") -> logging.Logger',
    docstring: 'Configure application logging.',
    imports: ['logging'],
    hash: 'hash-chunk-5',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

/**
 * Get a subset of chunks for specific test scenarios
 */
export function getChunksByLanguage(language: string): CodeChunk[] {
  return sampleChunks.filter(c => c.language === language);
}

export function getChunksByType(type: string): CodeChunk[] {
  return sampleChunks.filter(c => c.type === type);
}

export function getChunkById(id: string): CodeChunk | undefined {
  return sampleChunks.find(c => c.id === id);
}

/**
 * Create a minimal valid chunk for testing
 */
export function createMinimalChunk(overrides: Partial<CodeChunk> = {}): CodeChunk {
  const now = new Date();
  return {
    id: `chunk-${Date.now()}`,
    filePath: 'test.ts',
    name: 'testFunction',
    type: 'function',
    language: 'typescript',
    startLine: 1,
    endLine: 5,
    content: 'function test() { return true; }',
    signature: 'test(): boolean',
    imports: [],
    hash: `hash-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
