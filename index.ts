import { createServer, Tool, z } from '@modelcontextprotocol/sdk';
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import { generateEmbedding, VECTOR_SIZE } from './embedding-utils';
import { 
  QdrantSearchResult, 
  QdrantCollection, 
  QdrantCollectionsResponse,
  FormattedResult,
  QdrantSearchResponse
} from './qdrant-types';

// Load environment variables
dotenv.config();

// Qdrant client setup
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

// Collection name
const collectionName = process.env.QDRANT_COLLECTION || 'documents';

// Initialize server
async function main() {
  // Define the retrieval tool
  const retrieveFromQdrant: Tool = {
    name: 'retrieve_from_qdrant',
    description: 'Retrieve information from Qdrant vector database based on semantic similarity',
    inputSchema: z.object({
      query: z.string().describe('The search query for retrieval'),
      limit: z.number().default(3).describe('Number of results to retrieve'),
      scoreThreshold: z.number().default(0.7).describe('Minimum similarity score threshold (0-1)'),
    }),
    execute: async (params: { query: string; limit: number; scoreThreshold: number }): Promise<QdrantSearchResponse> => {
      try {
        const { query, limit, scoreThreshold } = params;
        
        // Convert query to vector embedding
        const queryEmbedding = await generateEmbedding(query);
        
        // Search Qdrant
        const searchResults = await qdrantClient.search(collectionName, {
          vector: queryEmbedding,
          limit: limit,
          score_threshold: scoreThreshold,
          with_payload: true,
        }) as QdrantSearchResult[];
        
        // Format results
        const formattedResults: FormattedResult[] = searchResults.map((result: QdrantSearchResult) => ({
          text: result.payload?.text || '',
          metadata: {
            source: result.payload?.source || '',
            score: result.score,
          },
        }));
        
        return {
          results: formattedResults,
        };
      } catch (error) {
        console.error('Error during vector search:', error);
        throw new Error(`Failed to retrieve from Qdrant: ${error}`);
      }
    }
  };

  // Start the server
  const server = createServer({
    tools: [retrieveFromQdrant],
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  
  server.listen(port, () => {
    console.log(`Qdrant MCP Server running on port ${port}`);
  });
}

// Check if Qdrant collection exists, create if it doesn't
async function ensureCollection() {
  try {
    const collections = await qdrantClient.getCollections() as QdrantCollectionsResponse;
    const collectionExists = collections.collections.some((c: QdrantCollection) => c.name === collectionName);
    
    if (!collectionExists) {
      console.log(`Creating collection ${collectionName}...`);
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        }
      });
      console.log(`Collection ${collectionName} created.`);
    } else {
      console.log(`Collection ${collectionName} already exists.`);
    }
  } catch (error) {
    console.error('Error ensuring collection exists:', error);
    throw error;
  }
}

// Run the server
ensureCollection()
  .then(() => main())
  .catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  }); 