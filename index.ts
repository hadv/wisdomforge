#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from 'dotenv';
import { DatabaseService } from './src/core/db-service';

// Load environment variables
dotenv.config();

// Database service initialization
const dbService = new DatabaseService();

// Define the retrieval tool
const RETRIEVAL_TOOL: Tool = {
  name: 'retrieve_information',
  description: 'Retrieve information from vector database based on semantic similarity',
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
    name: "vector-retrieval-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [RETRIEVAL_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'retrieve_information') {
    const { query, limit = 3, scoreThreshold = 0.7 } = args as Record<string, any>;
    
    try {
      // Search using the database service
      const formattedResults = await dbService.search(query, limit, scoreThreshold);
      
      return {
        content: [
          { type: "text", text: JSON.stringify({ results: formattedResults }) }
        ],
      };
    } catch (error) {
      console.error('Error during vector search:', error);
      return {
        content: [{ type: "text", text: `Failed to retrieve information: ${error}` }],
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
  // Initialize the database service
  await dbService.initialize();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Vector Retrieval Server running on stdio");
  
  // Optional HTTP server
  if (process.env.HTTP_SERVER === "true") {
    const port = parseInt(process.env.PORT || '3000', 10);
    // HTTP server code would go here
    console.log(`Vector Retrieval MCP Server running on port ${port}`);
  }
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
}); 