#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from 'dotenv';
import { DatabaseService } from './core/database-service';
import { KnowledgeTools } from './core/knowledge-tools';

// Load environment variables
dotenv.config();

// Service initialization
const dbService = new DatabaseService();
const knowledgeTools = new KnowledgeTools(dbService);

// Server setup
const server = new Server(
  {
    name: "wisdomforge",
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
  tools: knowledgeTools.getTools(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const tool = knowledgeTools.getTools().find(t => t.name === name);
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
  
  console.log("Knowledge Management Tools Server started successfully");
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
}); 