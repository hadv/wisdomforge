# Qdrant MCP Server for RAG

A Model Context Protocol (MCP) server implementation for RAG (Retrieval-Augmented Generation) using Qdrant vector database.

## Features

* **Vector Search**: Perform semantic search over your vector embeddings stored in Qdrant.
* **Customizable Parameters**: Configure search parameters like limit and score threshold.
* **Ready for LLM Integration**: Seamlessly integrates with Claude Desktop and other MCP-compatible tools.

## Tools

* **retrieve_from_qdrant**  
   * Perform vector similarity search against a Qdrant collection.  
   * Inputs:  
     * `query` (string): The search query for retrieval.  
     * `limit` (number, optional): Number of results to retrieve (default: 3).  
     * `scoreThreshold` (number, optional): Minimum similarity score threshold (default: 0.7).

## Prerequisites

* Node.js v16+
* Qdrant instance (local or cloud)
* Optional: OpenAI API key (for production embedding generation)

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```
   QDRANT_URL=http://localhost:6333
   QDRANT_COLLECTION=documents
   QDRANT_API_KEY=your_api_key_if_needed
   PORT=3000
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Start the server:
   ```bash
   npm start
   ```

## Docker Deployment

Build and run with Docker:

```bash
# Build the image
docker build -t mcp/qdrant-server .

# Run the container
docker run -p 3000:3000 \
  -e QDRANT_URL=http://your-qdrant-instance:6333 \
  -e QDRANT_COLLECTION=documents \
  -e QDRANT_API_KEY=your_api_key_if_needed \
  mcp/qdrant-server
```

## Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "qdrant-retrieval": {
      "command": "docker",
      "args": [
        "run", 
        "-i", 
        "--rm", 
        "-e", "QDRANT_URL", 
        "-e", "QDRANT_COLLECTION", 
        "-e", "QDRANT_API_KEY", 
        "mcp/qdrant-server"
      ],
      "env": {
        "QDRANT_URL": "http://your-qdrant-instance:6333",
        "QDRANT_COLLECTION": "documents",
        "QDRANT_API_KEY": "your_api_key_if_needed"
      }
    }
  }
}
```

Alternatively, for NPM usage:

```json
{
  "mcpServers": {
    "qdrant-retrieval": {
      "command": "npx",
      "args": [
        "-y",
        "qdrant-mcp-server"
      ],
      "env": {
        "QDRANT_URL": "http://your-qdrant-instance:6333",
        "QDRANT_COLLECTION": "documents",
        "QDRANT_API_KEY": "your_api_key_if_needed"
      }
    }
  }
}
```

## Customization

### Using a Different Embedding Model

To use a different embedding model, modify the `generateEmbedding` function in `embedding-utils.ts`. Replace the mock implementation with your preferred embedding API call.

### Extending the Search Response

To modify the search response format, update the type definitions in `qdrant-types.ts` and adjust the formatting in the `execute` function of the `retrieveFromQdrant` tool.

## License

This MCP server is licensed under the MIT License. 