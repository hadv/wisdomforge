# WisdomForge

A powerful knowledge management system that forges wisdom from experiences, insights, and best practices. Built with Qdrant vector database for efficient knowledge storage and retrieval.

## Features

- Intelligent knowledge management and retrieval
- Support for multiple knowledge types (best practices, lessons learned, insights, experiences)
- Configurable database selection via environment variables
- Uses Qdrant's built-in FastEmbed for efficient embedding generation
- Domain knowledge storage and retrieval
- Deployable to Smithery.ai platform

## Prerequisites

- Node.js 20.x or later (LTS recommended)
- npm 10.x or later
- Qdrant or Chroma vector database

## Installation

1. Clone the repository:
```bash
git clone https://github.com/hadv/wisdomforge
cd wisdomforge
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory based on the `.env.example` template:
```bash
cp .env.example .env
```

4. Configure your environment variables in the `.env` file:

### Required Environment Variables

#### Database Configuration
- `DATABASE_TYPE`: Choose your vector database (`qdrant` or `chroma`)
- `COLLECTION_NAME`: Name of your vector collection
- `QDRANT_URL`: URL of your Qdrant instance (required if using Qdrant)
- `QDRANT_API_KEY`: API key for Qdrant (required if using Qdrant)
- `CHROMA_URL`: URL of your Chroma instance (required if using Chroma)

#### Server Configuration
- `HTTP_SERVER`: Set to `true` to enable HTTP server mode
- `PORT`: Port number for local development only (default: 3000). Not used in Smithery cloud deployment.

Example `.env` configuration for Qdrant:
```env
DATABASE_TYPE=qdrant
COLLECTION_NAME=wisdom_collection
QDRANT_URL=https://your-qdrant-instance.example.com:6333
QDRANT_API_KEY=your_api_key
HTTP_SERVER=true
PORT=3000  # Only needed for local development
```

5. Build the project:
```bash
npm run build
```

## AI IDE Integration

### Cursor AI IDE
Add this configuration to your `~/.cursor/mcp.json` or `.cursor/mcp.json` file:
```json
{
  "mcpServers": {
    "wisdomforge": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@hadv/wisdomforge",
        "--key",
        "YOUR_API_KEY",
        "--config",
        "{\"database\":{\"type\":\"qdrant\",\"collectionName\":\"YOUR_COLLECTION_NAME\",\"url\":\"YOUR_QDRANT_URL\",\"apiKey\":\"YOUR_QDRANT_API_KEY\"}}",
        "--transport",
        "ws"
      ]
    }
  }
}
```

Replace the following placeholders in the configuration:
- `YOUR_API_KEY`: Your Smithery API key
- `YOUR_COLLECTION_NAME`: Your Qdrant collection name
- `YOUR_QDRANT_URL`: Your Qdrant instance URL
- `YOUR_QDRANT_API_KEY`: Your Qdrant API key

Note: Make sure you have Node.js installed and `npx` available in your PATH. If you're using nvm, ensure you're using the correct Node.js version by running `nvm use --lts` before starting Cursor.

### Claude Desktop
Add this configuration in Claude's settings:
```json
{
  "processes": {
    "knowledge_server": {
      "command": "/path/to/your/project/run-mcp.sh",
      "args": []
    }
  },
  "tools": [
    {
      "name": "store_knowledge",
      "description": "Store domain-specific knowledge in a vector database",
      "provider": "process",
      "process": "knowledge_server"
    },
    {
      "name": "retrieve_knowledge_context",
      "description": "Retrieve relevant domain knowledge from a vector database",
      "provider": "process",
      "process": "knowledge_server"
    }
  ]
}
```
