import { QdrantClient } from '@qdrant/js-client-rest';
import { ChromaClient, Collection, IncludeEnum, IEmbeddingFunction } from 'chromadb';
import { generateEmbedding, VECTOR_SIZE } from './embedding-utils';
import { FormattedResult } from './qdrant-types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database type
export enum DatabaseType {
  QDRANT = 'qdrant',
  CHROMA = 'chroma'
}

// Simple embedding function implementation for Chroma
class CustomEmbeddingFunction implements IEmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }
}

// Database service class
export class DatabaseService {
  private qdrantClient?: QdrantClient;
  private chromaClient?: ChromaClient;
  private chromaCollection?: Collection;
  private dbType: DatabaseType;
  private collectionName: string;
  private embeddingFunction: IEmbeddingFunction;

  constructor() {
    // Determine which database to use from environment
    this.dbType = (process.env.DATABASE_TYPE?.toLowerCase() === 'chroma')
      ? DatabaseType.CHROMA
      : DatabaseType.QDRANT;
    
    this.collectionName = process.env.COLLECTION_NAME || 'documents';
    this.embeddingFunction = new CustomEmbeddingFunction();
    
    console.log(`Using database type: ${this.dbType}`);
  }

  async initialize(): Promise<void> {
    if (this.dbType === DatabaseType.QDRANT) {
      await this.initializeQdrant();
    } else {
      await this.initializeChroma();
    }
  }

  private async initializeQdrant(): Promise<void> {
    this.qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });

    try {
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!collectionExists) {
        console.log(`Creating Qdrant collection ${this.collectionName}...`);
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          }
        });
        console.log(`Qdrant collection ${this.collectionName} created.`);
      } else {
        console.log(`Qdrant collection ${this.collectionName} already exists.`);
      }
    } catch (error) {
      console.error('Error ensuring Qdrant collection exists:', error);
      throw error;
    }
  }

  private async initializeChroma(): Promise<void> {
    this.chromaClient = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000'
    });

    try {
      // List collections to check if ours exists
      const collections = await this.chromaClient.listCollections();
      const collectionExists = collections.some((collection: any) => collection.name === this.collectionName);
      
      if (!collectionExists) {
        console.log(`Creating Chroma collection ${this.collectionName}...`);
        this.chromaCollection = await this.chromaClient.createCollection({
          name: this.collectionName,
          metadata: { 'description': 'MCP Server collection' },
          embeddingFunction: this.embeddingFunction
        });
        console.log(`Chroma collection ${this.collectionName} created.`);
      } else {
        console.log(`Chroma collection ${this.collectionName} already exists.`);
        this.chromaCollection = await this.chromaClient.getCollection({
          name: this.collectionName,
          embeddingFunction: this.embeddingFunction
        });
      }
    } catch (error) {
      console.error('Error ensuring Chroma collection exists:', error);
      throw error;
    }
  }

  async search(query: string, limit: number = 3, scoreThreshold: number = 0.7): Promise<FormattedResult[]> {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    
    if (this.dbType === DatabaseType.QDRANT) {
      return this.searchQdrant(queryEmbedding, limit, scoreThreshold);
    } else {
      return this.searchChroma(queryEmbedding, limit);
    }
  }

  private async searchQdrant(queryEmbedding: number[], limit: number, scoreThreshold: number): Promise<FormattedResult[]> {
    if (!this.qdrantClient) {
      throw new Error('Qdrant client not initialized');
    }

    const searchResults = await this.qdrantClient.search(this.collectionName, {
      vector: queryEmbedding,
      limit: limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    });
    
    return searchResults.map(result => ({
      text: String(result.payload?.text || ''),
      metadata: {
        source: String(result.payload?.source || ''),
        score: result.score,
      },
    }));
  }

  private async searchChroma(queryEmbedding: number[], limit: number): Promise<FormattedResult[]> {
    if (!this.chromaCollection) {
      throw new Error('Chroma collection not initialized');
    }

    const searchResults = await this.chromaCollection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      include: [IncludeEnum.Documents, IncludeEnum.Metadatas, IncludeEnum.Distances]
    });
    
    // Convert results to FormattedResult format
    const formattedResults: FormattedResult[] = [];
    
    if (searchResults.documents && searchResults.documents.length > 0 && 
        searchResults.metadatas && searchResults.distances) {
      // First array is for the first query
      const docs = searchResults.documents[0] || [];
      const metas = searchResults.metadatas[0] || [];
      const distances = searchResults.distances[0] || [];
      
      for (let i = 0; i < docs.length; i++) {
        // In Chroma, lower distance is better, so convert to a similarity score (1 - distance)
        // Assuming distances are normalized between 0-1
        const similarityScore = 1 - (distances[i] || 0);
        
        // Handle documents - ensure we have a valid string
        let docText = '';
        if (docs[i] !== null && docs[i] !== undefined) {
          docText = String(docs[i]);
        }
        
        // Handle metadata - ensure we have a valid object
        let metaObj: Record<string, any> = {};
        let source = '';
        
        if (metas[i] && typeof metas[i] === 'object') {
          metaObj = metas[i] as Record<string, any>;
          // Ensure source is a string
          if (metaObj.source !== undefined) {
            source = String(metaObj.source);
          }
        }
        
        // Construct the formatted result with proper types
        formattedResults.push({
          text: docText,
          metadata: {
            source: source,
            score: similarityScore,
            ...metaObj
          }
        });
      }
    }
    
    return formattedResults;
  }
} 