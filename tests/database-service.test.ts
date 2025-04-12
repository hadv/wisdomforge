import { DatabaseService } from '../src/core/database-service';
import * as embeddingUtils from '../src/utils/embedding';
import { VECTOR_SIZE } from '../src/configs/qdrant';

// Mock the embedding-utils module
jest.mock('@utils/embedding', () => ({
  generateEmbedding: jest.fn(),
}));

// Mock config module
jest.mock('@configs/qdrant', () => ({
  VECTOR_SIZE: 384,
  QDRANT_URL: 'http://mock-qdrant:6333',
  QDRANT_API_KEY: 'mock-api-key'
}));

// Mock QdrantClient
jest.mock('@qdrant/js-client-rest', () => {
  return {
    QdrantClient: jest.fn().mockImplementation(() => ({
      getCollections: jest.fn().mockResolvedValue({ collections: [] }),
      createCollection: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockImplementation((collectionName, params) => {
        const results = [
          {
            payload: { text: 'Test document 1', source: 'test-source-1' },
            score: 0.9
          },
          {
            payload: { text: 'Test document 2', source: 'test-source-2' },
            score: 0.8
          }
        ];
        return Promise.resolve(results.slice(0, params.limit));
      })
    }))
  };
});

// Mock ChromaClient
jest.mock('chromadb', () => {
  const mockCollection = {
    query: jest.fn().mockImplementation(({ nResults }) => {
      const docs = ['Test document 1', 'Test document 2'].slice(0, nResults);
      const metas = [{ source: 'test-source-1' }, { source: 'test-source-2' }].slice(0, nResults);
      const distances = [0.1, 0.2].slice(0, nResults);
      return Promise.resolve({
        documents: [docs],
        metadatas: [metas],
        distances: [distances]
      });
    })
  };
  
  return {
    ChromaClient: jest.fn().mockImplementation(() => ({
      listCollections: jest.fn().mockResolvedValue([]),
      createCollection: jest.fn().mockResolvedValue(mockCollection),
      getCollection: jest.fn().mockResolvedValue(mockCollection)
    })),
    IncludeEnum: {
      Documents: 'documents',
      Metadatas: 'metadatas',
      Distances: 'distances'
    }
  };
});

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  // Mock generateEmbedding to return a vector of the correct size
  (embeddingUtils.generateEmbedding as jest.Mock).mockResolvedValue(
    Array(VECTOR_SIZE).fill(0.1)
  );
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

describe('DatabaseService', () => {
  describe('initialization', () => {
    it('should initialize with Qdrant by default', async () => {
      process.env.DATABASE_TYPE = 'qdrant';
      
      const dbService = new DatabaseService();
      await dbService.initialize();
      
      // We can't check private properties directly, so we'll test via search function
      await expect(dbService.search('test query')).resolves.toHaveLength(2);
    });
    
    it('should initialize with Chroma when specified', async () => {
      process.env.DATABASE_TYPE = 'chroma';
      
      const dbService = new DatabaseService();
      await dbService.initialize();
      
      // We can't check private properties directly, so we'll test via search function
      await expect(dbService.search('test query')).resolves.toHaveLength(2);
    });
  });
  
  describe('search', () => {
    it('should return formatted results for Qdrant search', async () => {
      process.env.DATABASE_TYPE = 'qdrant';
      
      const dbService = new DatabaseService();
      await dbService.initialize();
      
      const results = await dbService.search('test query', 1);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('text', 'Test document 1');
      expect(results[0].metadata).toHaveProperty('source', 'test-source-1');
      expect(results[0].metadata).toHaveProperty('score', 0.9);
    });
    
    it('should return formatted results for Chroma search', async () => {
      process.env.DATABASE_TYPE = 'chroma';
      
      const dbService = new DatabaseService();
      await dbService.initialize();
      
      const results = await dbService.search('test query', 1);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('text', 'Test document 1');
      expect(results[0].metadata).toHaveProperty('source', 'test-source-1');
      // For Chroma, score is 1 - distance
      expect(results[0].metadata).toHaveProperty('score', 0.9);
    });
  });
}); 