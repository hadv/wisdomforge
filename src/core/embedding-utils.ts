/**
 * Embedding utilities for Qdrant MCP Server
 * 
 * This file contains utility functions for generating and managing embeddings.
 * For production use, we use Google's Gemini embedding model.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Vector dimension for Gemini embedding-001 model
export const VECTOR_SIZE = 768;

// Initialize the Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

/**
 * Generate an embedding vector for the provided text
 * 
 * Uses Google's Gemini embedding-001 model
 * 
 * @param text The text to generate an embedding for
 * @returns A vector representation of the text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Check if we have a Gemini API key
    if (!GEMINI_API_KEY) {
      console.warn('Warning: GEMINI_API_KEY not found in environment variables. Using mock embeddings.');
      // Fall back to mock implementation if no API key
      return Array.from({ length: VECTOR_SIZE }, () => Math.random() - 0.5);
    }
    
    // Trim text if it's too long
    // Gemini has a limit of 3072 tokens for embeddings
    const trimmedText = text.slice(0, 25000); // Approximate length to stay under token limit
    
    // Get the embedding model
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    
    // Generate embeddings
    const result = await embeddingModel.embedContent(trimmedText);
    const embedding = result.embedding.values;
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding with Gemini:', error);
    // Fall back to mock implementation in case of errors
    console.warn('Falling back to mock embeddings due to API error.');
    return Array.from({ length: VECTOR_SIZE }, () => Math.random() - 0.5);
  }
}

/**
 * Helper function to calculate cosine similarity between two vectors
 * 
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity score (0-1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must be of the same length');
  }
  
  let dotProduct = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    aMagnitude += a[i] * a[i];
    bMagnitude += b[i] * b[i];
  }
  
  aMagnitude = Math.sqrt(aMagnitude);
  bMagnitude = Math.sqrt(bMagnitude);
  
  if (aMagnitude === 0 || bMagnitude === 0) {
    return 0;
  }
  
  return dotProduct / (aMagnitude * bMagnitude);
} 