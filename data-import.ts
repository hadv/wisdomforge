/**
 * Data Import Script for Vector Database MCP Server
 * 
 * This script provides utilities for importing documents into the selected vector database.
 * Usage: ts-node data-import.ts --file=your-data.json
 */

import { generateEmbedding } from './embedding-utils';
import { DatabaseService, DatabaseType } from './db-service';
import { FormattedResult } from './qdrant-types';
import { ChromaDocument } from './chroma-types';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ChromaClient, IEmbeddingFunction } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Collection, IncludeEnum } from 'chromadb';
import pdf from 'pdf-parse';
import { DatabaseService as _DatabaseService } from './db-service';
import { FormattedResult as _FormattedResult } from './qdrant-types';
import { ChromaDocument as _ChromaDocument } from './chroma-types';

// Load environment variables
dotenv.config();

// Custom embedding function for Chroma
class CustomEmbeddingFunction implements IEmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }
}

// Determine which database to use
const dbType = (process.env.DATABASE_TYPE?.toLowerCase() === 'chroma')
  ? DatabaseType.CHROMA
  : DatabaseType.QDRANT;

// Collection name
const collectionName = process.env.COLLECTION_NAME || 'documents';

// Database clients
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const chromaClient = new ChromaClient({
  path: process.env.CHROMA_URL || 'http://localhost:8000'
});

// Create embedding function instance
const embeddingFunction = new CustomEmbeddingFunction();

/**
 * Import documents from a JSON file into vector database
 * 
 * @param filePath Path to the JSON file with documents
 */
async function importFromFile(filePath: string) {
  try {
    console.log(`Importing documents to ${dbType} from ${filePath}...`);
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const documents = JSON.parse(fileContent);
    
    // Process based on database type
    if (dbType === DatabaseType.QDRANT) {
      await importToQdrant(documents);
    } else {
      await importToChroma(documents);
    }
    
    console.log(`Import completed! ${documents.length} documents processed.`);
  } catch (error) {
    console.error('Error importing documents:', error);
    process.exit(1);
  }
}

/**
 * Import documents to Qdrant
 */
async function importToQdrant(documents: any[]) {
  try {
    // Ensure collection exists
    await ensureQdrantCollection();
    
    // Process documents in batches
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing ${documents.length} documents in ${batches.length} batches for Qdrant...`);
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} documents)...`);
      
      // Process documents in parallel
      const promises = batch.map(async (doc) => {
        const embedding = await generateEmbedding(doc.text);
        return {
          id: doc.id,
          vector: embedding,
          payload: {
            text: doc.text,
            source: doc.source,
            ...(doc.metadata || {}),
          },
        };
      });
      
      const points = await Promise.all(promises);
      
      // Insert batch into Qdrant
      await qdrantClient.upsert(collectionName, {
        points,
      });
      
      console.log(`Batch ${i + 1} processed successfully.`);
    }
  } catch (error) {
    console.error('Error importing to Qdrant:', error);
    throw error;
  }
}

/**
 * Import documents to Chroma
 */
async function importToChroma(documents: any[]) {
  try {
    // Ensure collection exists
    const collection = await ensureChromaCollection();
    
    // Process documents in batches
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing ${documents.length} documents in ${batches.length} batches for Chroma...`);
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} documents)...`);
      
      // Prepare data for Chroma
      const ids: string[] = [];
      const texts: string[] = [];
      const metadatas: any[] = [];
      
      // Process documents
      batch.forEach((doc, index) => {
        ids.push(doc.id);
        texts.push(doc.text);
        metadatas.push({
          source: doc.source,
          ...(doc.metadata || {}),
        });
      });
      
      // Insert batch into Chroma
      await collection.add({
        ids,
        documents: texts,
        metadatas
      });
      
      console.log(`Batch ${i + 1} processed successfully.`);
    }
  } catch (error) {
    console.error('Error importing to Chroma:', error);
    throw error;
  }
}

/**
 * Ensure Qdrant collection exists
 */
async function ensureQdrantCollection() {
  try {
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(c => c.name === collectionName);
    
    if (!collectionExists) {
      console.log(`Creating Qdrant collection ${collectionName}...`);
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: 1536, // OpenAI embedding size
          distance: 'Cosine',
        }
      });
      console.log(`Qdrant collection ${collectionName} created.`);
    } else {
      console.log(`Qdrant collection ${collectionName} already exists.`);
    }
    
    return qdrantClient;
  } catch (error) {
    console.error('Error ensuring Qdrant collection exists:', error);
    throw error;
  }
}

/**
 * Ensure Chroma collection exists
 */
async function ensureChromaCollection() {
  try {
    const collections = await chromaClient.listCollections();
    const collectionExists = collections.some((collection: any) => collection.name === collectionName);
    
    if (!collectionExists) {
      console.log(`Creating Chroma collection ${collectionName}...`);
      const collection = await chromaClient.createCollection({
        name: collectionName,
        metadata: { 'description': 'MCP Server collection' },
        embeddingFunction: embeddingFunction
      });
      console.log(`Chroma collection ${collectionName} created.`);
      return collection;
    } else {
      console.log(`Chroma collection ${collectionName} already exists.`);
      const collection = await chromaClient.getCollection({
        name: collectionName,
        embeddingFunction: embeddingFunction
      });
      return collection;
    }
  } catch (error) {
    console.error('Error ensuring Chroma collection exists:', error);
    throw error;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      args[key] = value;
    }
  });
  return args;
}

// Execute script if run directly
if (require.main === module) {
  const args = parseArgs();
  
  if (!args.file) {
    console.error('Please provide a file path with --file=your-data.json');
    process.exit(1);
  }
  
  const filePath = path.resolve(args.file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  importFromFile(filePath).catch(error => {
    console.error('Import failed:', error);
    process.exit(1);
  });
}

// Process files one by one
const processFiles = async (dirPath: string) => {
  const files = fs.readdirSync(dirPath);
  
  for (const [_index, file] of files.entries()) {
    const filePath = path.join(dirPath, file);
    
    // Skip directories and non-PDF files
    if (fs.statSync(filePath).isDirectory() || !filePath.toLowerCase().endsWith('.pdf')) {
      continue;
    }
    
    // ... existing code ...
  }
}; 