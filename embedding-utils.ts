/**
 * Embedding utilities for Qdrant MCP Server
 * 
 * This file contains utility functions for generating and managing embeddings.
 * In a production environment, you would replace the mock function with a real
 * embedding API call (like OpenAI, Cohere, etc.)
 */

// Vector dimension (adjust based on your embeddings model)
export const VECTOR_SIZE = 1536; // Default for OpenAI ada-002

/**
 * Generate an embedding vector for the provided text
 * 
 * NOTE: This is a mock implementation. In production, replace with a real embedding API.
 * 
 * @param text The text to generate an embedding for
 * @returns A vector representation of the text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // In a real implementation, you would call an embedding API
  // Example with OpenAI (pseudo-code):
  // 
  // const response = await openai.embeddings.create({
  //   model: "text-embedding-ada-002",
  //   input: text,
  // });
  // return response.data[0].embedding;
  
  // Mock implementation that returns a random vector
  return Array.from({ length: VECTOR_SIZE }, () => Math.random() - 0.5);
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