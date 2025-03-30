#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from 'dotenv';
import { DatabaseService } from '@core/database-service';
import { KnowledgeManagementTools } from '@core/knowledge-management-tools';

// Load environment variables
dotenv.config();

// Service initialization
const dbService = new DatabaseService();
const knowledgeTools = new KnowledgeManagementTools(dbService);

// Server setup
const server = new Server(
  {
    name: "knowledge-management-server",
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
  
  console.error("Knowledge Management Server running on stdio");
  console.log("Knowledge Management Server started successfully");
  
  // Optional HTTP server
  if (process.env.HTTP_SERVER === "true") {
    const port = parseInt(process.env.PORT || '3000', 10);
    console.log(`Knowledge Management MCP Server running on port ${port}`);
  }
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
}); 