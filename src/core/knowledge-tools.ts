import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DatabaseService } from './database-service';

export interface DomainTool extends Tool {
  handler: (args?: any) => Promise<any>;
}

export class KnowledgeTools {
  constructor(private dbService: DatabaseService) {}

  getTools(): DomainTool[] {
    return [
      {
        name: 'store_knowledge',
        description: 'Store various types of knowledge, insights, and experiences in a specific domain. This includes but is not limited to: best practices, lessons learned, understandings, experiences, and solutions.',
        inputSchema: {
          type: "object",
          properties: {
            content: { 
              type: "string", 
              description: "The knowledge content to store (e.g., best practice, lesson learned, insight)" 
            },
            domain: { 
              type: "string", 
              description: "The knowledge domain this belongs to" 
            },
            knowledgeType: {
              type: "string",
              enum: ["best_practice", "lesson_learned", "insight", "experience", "solution", "understanding", "pattern", "anti_pattern", "tip", "troubleshooting"],
              description: "Type of knowledge being stored"
            },
            context: {
              type: "object",
              description: "Context about this knowledge",
              properties: {
                situation: { type: "string", description: "The situation or problem this knowledge addresses" },
                impact: { type: "string", description: "The impact or benefit of this knowledge" },
                prerequisites: { type: "array", items: { type: "string" }, description: "Prerequisites or requirements for this knowledge" },
                relatedTopics: { type: "array", items: { type: "string" }, description: "Related topics or concepts" }
              }
            },
            metadata: {
              type: "object",
              description: "Additional metadata about the knowledge",
              properties: {
                source: { type: "string", description: "Source of this knowledge (e.g., 'conversation', 'documentation', 'experience')" },
                timestamp: { type: "string", description: "When this knowledge was captured" },
                confidence: { type: "number", description: "Confidence level in this knowledge (0-1)" },
                verified: { type: "boolean", description: "Whether this knowledge has been verified" }
              }
            }
          },
          required: ["content", "domain", "knowledgeType"]
        },
        handler: async ({ content, domain, knowledgeType, context = {}, metadata = {} }) => {
          const docId = await this.dbService.storeDomainKnowledge(
            content,
            domain,
            {
              ...metadata,
              knowledge_type: knowledgeType,
              context,
              source: metadata.source || 'llm_interaction',
              timestamp: metadata.timestamp || new Date().toISOString(),
              confidence: metadata.confidence || 0.8,
              verified: metadata.verified || false
            }
          );
          return { 
            success: true, 
            documentId: docId,
            domain,
            knowledgeType,
            message: 'Knowledge stored successfully'
          };
        }
      },
      {
        name: 'retrieve_knowledge_context',
        description: 'Retrieve relevant knowledge and context for a given task or query. This tool helps LLM access its long-term memory and relevant context for better task execution.',
        inputSchema: {
          type: "object",
          properties: {
            query: { 
              type: "string", 
              description: "The current task or query to find relevant knowledge for" 
            },
            domains: { 
              type: "array", 
              items: { type: "string" },
              description: "Optional list of domains to search in. If not provided, searches across all domains." 
            },
            knowledgeTypes: {
              type: "array",
              items: { 
                type: "string",
                enum: ["best_practice", "lesson_learned", "insight", "experience", "solution", "understanding", "pattern", "anti_pattern", "tip", "troubleshooting"]
              },
              description: "Optional list of knowledge types to include"
            },
            context: {
              type: "object",
              description: "Current context to find relevant knowledge",
              properties: {
                currentSituation: { type: "string", description: "Current situation or problem being addressed" },
                relatedTopics: { type: "array", items: { type: "string" }, description: "Topics related to the current task" },
                constraints: { type: "array", items: { type: "string" }, description: "Any constraints or requirements for the current task" }
              }
            },
            options: {
              type: "object",
              description: "Additional retrieval options",
              properties: {
                maxResults: { type: "number", default: 5, description: "Maximum number of results to return" },
                minConfidence: { type: "number", default: 0.7, description: "Minimum confidence threshold for results" },
                includeContext: { type: "boolean", default: true, description: "Whether to include context information in results" },
                prioritizeRecent: { type: "boolean", default: true, description: "Whether to prioritize more recent knowledge" }
              }
            }
          },
          required: ["query"]
        },
        handler: async ({ query, domains, knowledgeTypes, context = {}, options = {} }) => {
          const {
            maxResults = 5,
            minConfidence = 0.7,
            includeContext = true,
            prioritizeRecent = true
          } = options;

          // Search for relevant knowledge
          const results = await this.dbService.search(query, maxResults, minConfidence);
          
          // Filter and format results for LLM context
          const formattedResults = results
            .filter(result => {
              // Apply domain filter if specified
              if (domains && domains.length > 0) {
                return domains.includes(result.metadata.domain);
              }
              return true;
            })
            .filter(result => {
              // Apply knowledge type filter if specified
              if (knowledgeTypes && knowledgeTypes.length > 0) {
                return knowledgeTypes.includes(result.metadata.knowledge_type);
              }
              return true;
            })
            .map(result => ({
              content: result.text,
              type: result.metadata.knowledge_type,
              domain: result.metadata.domain,
              confidence: result.metadata.score,
              timestamp: result.metadata.timestamp,
              ...(includeContext && {
                context: {
                  situation: result.metadata.context?.situation,
                  impact: result.metadata.context?.impact,
                  prerequisites: result.metadata.context?.prerequisites,
                  relatedTopics: result.metadata.context?.relatedTopics
                }
              })
            }))
            .sort((a, b) => prioritizeRecent ? 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() : 
              0
            );

          return {
            relevantKnowledge: formattedResults,
            currentContext: context,
            metadata: {
              totalResults: formattedResults.length,
              domains: domains || 'all',
              knowledgeTypes: knowledgeTypes || 'all',
              confidenceThreshold: minConfidence
            }
          };
        }
      }
    ];
  }
} 