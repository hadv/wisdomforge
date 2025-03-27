#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
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

// Define the retrieval tool
const RETRIEVAL_TOOL: Tool = {
  name: 'retrieve_from_qdrant',
  description: 'Retrieve information from Qdrant vector database based on semantic similarity',
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search query for retrieval" },
      limit: { type: "number", default: 3, description: "Number of results to retrieve" },
      scoreThreshold: { type: "number", default: 0.7, description: "Minimum similarity score threshold (0-1)" },
    },
    required: ["query"],
  },
};

// Server setup
const server = new Server(
  {
    name: "qdrant-retrieval-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

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

// Request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [RETRIEVAL_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'retrieve_from_qdrant') {
    const { query, limit = 3, scoreThreshold = 0.7 } = args as Record<string, any>;
    
    try {
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
        content: [
          { type: "text", text: JSON.stringify({ results: formattedResults }) }
        ],
      };
    } catch (error) {
      console.error('Error during vector search:', error);
      return {
        content: [{ type: "text", text: `Failed to retrieve from Qdrant: ${error}` }],
        isError: true,
      };
    }
  } else {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
});

// Server startup
async function runServer() {
  await ensureCollection();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Qdrant Retrieval Server running on stdio");
  
  // Optional HTTP server
  if (process.env.HTTP_SERVER === "true") {
    const port = parseInt(process.env.PORT || '3000', 10);
    // HTTP server code would go here
    console.log(`Qdrant MCP Server running on port ${port}`);
  }
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
}); 