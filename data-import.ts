/**
 * Data Import Script for Qdrant MCP Server
 * 
 * This script provides utilities for importing documents into Qdrant.
 * Usage: ts-node data-import.ts --file=your-data.json
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { generateEmbedding, VECTOR_SIZE } from './embedding-utils';
import { QdrantDocument } from './qdrant-types';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Qdrant client setup
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

// Collection name
const collectionName = process.env.QDRANT_COLLECTION || 'documents';

/**
 * Import documents from a JSON file into Qdrant
 * 
 * @param filePath Path to the JSON file with documents
 */
async function importFromFile(filePath: string) {
  try {
    console.log(`Importing documents from ${filePath}...`);
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const documents: QdrantDocument[] = JSON.parse(fileContent);
    
    // Ensure collection exists
    await ensureCollection();
    
    // Process documents in batches
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing ${documents.length} documents in ${batches.length} batches...`);
    
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
    
    console.log(`Import completed! ${documents.length} documents processed.`);
  } catch (error) {
    console.error('Error importing documents:', error);
    process.exit(1);
  }
}

/**
 * Ensure Qdrant collection exists
 */
async function ensureCollection() {
  try {
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(c => c.name === collectionName);
    
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