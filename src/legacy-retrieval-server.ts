#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from 'dotenv';
import { DatabaseService } from '@core/database-service';

// Load environment variables
dotenv.config();

interface DomainTool extends Tool {
  handler: (args?: any) => Promise<any>;
}

class LegacyRetrievalTools {
  constructor(private dbService: DatabaseService) {}

  getTools(): DomainTool[] {
    return [
      {
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
        handler: async ({ query, limit = 3, scoreThreshold = 0.7 }) => {
          const formattedResults = await this.dbService.search(query, limit, scoreThreshold);
          return { results: formattedResults };
        }
      }
    ];
  }
}

// Service initialization
const dbService = new DatabaseService();
const legacyTools = new LegacyRetrievalTools(dbService);

// Server setup
const server = new Server(
  {
    name: "legacy-retrieval-server",
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
  tools: legacyTools.getTools(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const tool = legacyTools.getTools().find(t => t.name === name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const result = await tool.handler(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  } catch (error) {
    console.error(`Error during tool execution (${name}):`, error);
    return {
      content: [{ type: "text", text: `Failed to execute tool: ${error}` }],
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
  
  console.error("Legacy Retrieval Server running on stdio");
  
  // Optional HTTP server
  if (process.env.HTTP_SERVER === "true") {
    const port = parseInt(process.env.PORT || '3000', 10);
    console.log(`Legacy Retrieval MCP Server running on port ${port}`);
  }
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
}); 