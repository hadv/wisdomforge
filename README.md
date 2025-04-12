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
Create the script `run-mcp.sh` in the project root:

```bash
#!/bin/zsh
cd /path/to/your/project
source ~/.zshrc
nvm use --lts

# Let the app load environment variables from .env file
node dist/index.js
```

Make the script executable:
```bash
chmod +x run-mcp.sh
```

Add this configuration to your `~/.cursor/mcp.json` or `.cursor/mcp.json` file:
```json
{
  "mcpServers": {
    "wisdomforge": {
      "command": "/path/to/your/project/run-mcp.sh",
      "args": []
    }
  }
}
```

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

## Deployment Options

### Option 1: Local Deployment
Run the MCP server on your local machine or your own infrastructure:

1. Configure your environment variables in `.env` file
2. Build the project:
```bash
npm run build
```
3. Start the server:
```bash
npm start
```

The server will run locally and be accessible at `http://localhost:3000` (or your configured PORT).

### Option 2: Smithery.ai Cloud Deployment
Deploy the MCP server to Smithery's cloud infrastructure:

1. Create an account on [Smithery.ai](https://smithery.ai)
2. Install the Smithery CLI:
```bash
npm install -g @smithery/cli
```

3. Login to Smithery:
```bash
smithery login
```

4. Create a new instance for your organization:
```bash
smithery create instance wisdomforge
```

5. Configure your environment variables in Smithery dashboard for your instance:
   - `DATABASE_TYPE` (default: "qdrant")
   - `COLLECTION_NAME` (required)
   - `HTTP_SERVER` (default: "true")
   - `QDRANT_URL` (required if using Qdrant)
   - `QDRANT_API_KEY` (required if using Qdrant)
   - `CHROMA_URL` (required if using Chroma)
   - Note: `PORT` is not needed for cloud deployment as Smithery handles networking

6. Deploy your server:
```bash
npm run deploy
```

### Choosing Between Local and Cloud Deployment

#### Local Deployment is recommended when:
- You need full control over the infrastructure
- You have specific security requirements
- You want to minimize costs
- You need to run the server behind a firewall
- You're in development or testing phase

#### Smithery Cloud Deployment is recommended when:
- You want managed infrastructure
- You need automatic scaling
- You want to avoid server maintenance
- You need high availability
- You're in production environment

### Instance Management (Cloud Deployment)
- Each organization/user needs their own Smithery.ai instance
- Instances are isolated and have their own configuration
- You can create multiple instances for different environments (dev, staging, prod)
- Instance URLs follow the pattern: `https://<instance-name>.smithery.ai`

### Post-Deployment
- Local: Server runs on your machine at `http://localhost:3000`
- Cloud: Server runs on Smithery at `https://<instance-name>.smithery.ai`
- Monitor your deployment in the Smithery dashboard (cloud only)
- Use the health check endpoint at `/health` to verify server status

### Multi-User Setup
For cloud deployment, if you need to share access with team members:
1. Add team members to your Smithery.ai organization
2. Grant them appropriate permissions for your instance
3. Each team member can use the same instance URL but should configure their own:
   - Database credentials
   - Collection names
   - Other environment-specific settings

For local deployment:
- Each user runs their own instance
- Users need to configure their own environment variables
- No shared access is possible unless you set up your own infrastructure

## MCP Client Connection

### Local Deployment Connection
When running the server locally, MCP clients (like Cursor or Claude) can connect using the following configuration:

#### Cursor AI IDE
Update your `~/.cursor/mcp.json` or `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "wisdomforge": {
      "url": "http://localhost:3000",
      "type": "http"
    }
  }
}
```

#### Claude Desktop
Update your Claude settings:
```json
{
  "processes": {
    "knowledge_server": {
      "url": "http://localhost:3000",
      "type": "http"
    }
  },
  "tools": [
    {
      "name": "store_knowledge",
      "description": "Store domain-specific knowledge in a vector database",
      "provider": "http",
      "url": "http://localhost:3000"
    },
    {
      "name": "retrieve_knowledge_context",
      "description": "Retrieve relevant domain knowledge from a vector database",
      "provider": "http",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Connection Notes
1. For local deployment:
   - No authentication required
   - Server must be running before clients can connect
   - Use `http://localhost:3000` or your configured PORT
   - HTTP server is enabled by default

2. For cloud deployment:
   - Authentication required via Smithery API key
   - Server is always available
   - Use `https://<instance-name>.smithery.ai`
   - HTTP server is enabled by default
   - Replace `<instance-name>` with your actual instance name
   - Replace `<your-smithery-api-key>` with your actual Smithery API key

3. Testing the Connection:
   - Use the health check endpoint: `GET /health`
   - Local: `http://localhost:3000/health`
   - Cloud: `https://<instance-name>.smithery.ai/health`

## Usage

### Starting the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Storing Documentation

The server includes a script to store documentation files (PDF and TXT) with metadata:

```bash
npm run store-doc <path-to-your-file>
```

Example:
```bash
# Store a PDF file
npm run store-doc docs/manual.pdf

# Store a text file
npm run store-doc docs/readme.txt
```

The script will:
- Extract content from the file (text from PDF or plain text)
- Store the content with metadata including:
  - Source: "documentation"
  - File name and extension
  - File size
  - Last modified date
  - Creation date
  - Content type

### API Endpoints

#### Store Domain Knowledge

```http
POST /api/store
Content-Type: application/json

{
  "content": "Your domain knowledge content here",
  "source": "your-source",
  "metadata": {
    "key": "value"
  }
}
```

#### Query Domain Knowledge

```http
POST /api/query
Content-Type: application/json

{
  "query": "Your search query here",
  "limit": 5
}
```

## Development

### Running Tests

```bash
npm test
```

### Building the Project

```bash
npm run build
```

### Linting

```bash
npm run lint
```


## Using with Remote Qdrant

When using with a remote Qdrant instance (like Qdrant Cloud):

1. Ensure your `.env` has the correct URL with port number:
```
QDRANT_URL=https://your-instance-id.region.gcp.cloud.qdrant.io:6333
```

2. Set your API key:
```
QDRANT_API_KEY=your_qdrant_api_key
```

## FastEmbed Integration

This project uses Qdrant's built-in FastEmbed for efficient embedding generation:

### Benefits
- Lightweight and fast embedding generation
- Uses quantized model weights and ONNX Runtime for inference
- Better accuracy than OpenAI Ada-002 according to Qdrant
- No need for external embedding API keys

### How It Works
1. The system connects to your Qdrant instance
2. When generating embeddings, it uses Qdrant's server-side embedding endpoint
3. This eliminates the need for external embedding APIs and simplifies the architecture

### Configuration
No additional configuration is needed as FastEmbed is built into Qdrant. Just ensure your Qdrant URL and API key are correctly set in your `.env` file.

## Troubleshooting

If you encounter issues:

1. Make sure you're using Node.js LTS version (`nvm use --lts`)
2. Verify your environment variables are correct
3. Check Qdrant/Chroma connectivity
4. Ensure your Qdrant instance is properly configured