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
import http from 'http';

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

// Custom HTTP transport implementation
class HttpTransport {
  private server: http.Server;
  private port: number;

  constructor(port: number) {
    this.port = port;
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.method === 'POST' && req.url === '/') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const request = JSON.parse(body);
          let response;
          if (request.method === 'listTools') {
            response = { tools: knowledgeTools.getTools() };
          } else if (request.method === 'callTool') {
            const { name, arguments: args } = request.params;
            const tool = knowledgeTools.getTools().find(t => t.name === name);
            if (!tool) {
              throw new Error(`Unknown tool: ${name}`);
            }
            response = { content: [{ type: "text", text: JSON.stringify(await tool.handler(args)) }] };
          } else {
            throw new Error('Unsupported method');
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: errorMessage }));
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  }

  async start() {
    return new Promise<void>((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`HTTP server listening on port ${this.port}`);
        resolve();
      });
    });
  }
}

// Server startup
async function runServer() {
  // Initialize the database service
  await dbService.initialize();
  
  const useHttp = process.env.HTTP_SERVER === 'true';
  
  if (useHttp) {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const httpTransport = new HttpTransport(port);
    await httpTransport.start();
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Knowledge Management Tools Server started successfully using Stdio transport");
  }
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
}); 