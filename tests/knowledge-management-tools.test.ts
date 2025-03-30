import { KnowledgeManagementTools } from '@core/knowledge-management-tools';
import { DatabaseService } from '@core/database-service';

// Mock the DatabaseService
jest.mock('@core/database-service');

describe('KnowledgeManagementTools', () => {
  let dbServiceMock: jest.Mocked<DatabaseService>;
  let kmTools: KnowledgeManagementTools;

  beforeEach(() => {
    // Create a mock for DatabaseService
    dbServiceMock = new DatabaseService() as jest.Mocked<DatabaseService>;
    
    // Mock the search and storeDomainKnowledge methods
    dbServiceMock.search = jest.fn().mockResolvedValue([
      {
        text: 'Test knowledge 1',
        metadata: {
          domain: 'test-domain',
          knowledge_type: 'best_practice',
          score: 0.95,
          timestamp: '2023-01-01T00:00:00Z',
          context: {
            situation: 'Test situation',
            impact: 'Test impact',
            prerequisites: ['prereq1'],
            relatedTopics: ['topic1']
          }
        }
      },
      {
        text: 'Test knowledge 2',
        metadata: {
          domain: 'test-domain-2',
          knowledge_type: 'tip',
          score: 0.85,
          timestamp: '2023-01-02T00:00:00Z'
        }
      }
    ]);
    
    dbServiceMock.storeDomainKnowledge = jest.fn().mockResolvedValue('test-doc-id');
    
    // Initialize KnowledgeManagementTools with the mock
    kmTools = new KnowledgeManagementTools(dbServiceMock);
  });

  describe('store_knowledge tool', () => {
    it('should store knowledge via the database service', async () => {
      const tools = kmTools.getTools();
      const storeKnowledgeTool = tools.find(t => t.name === 'store_knowledge');
      
      expect(storeKnowledgeTool).toBeDefined();
      
      const result = await storeKnowledgeTool!.handler({
        content: 'Test best practice',
        domain: 'testing',
        knowledgeType: 'best_practice',
        context: {
          situation: 'When testing',
          impact: 'Better tests'
        }
      });
      
      expect(dbServiceMock.storeDomainKnowledge).toHaveBeenCalledWith(
        'Test best practice',
        'testing',
        expect.objectContaining({
          knowledge_type: 'best_practice',
          context: {
            situation: 'When testing',
            impact: 'Better tests'
          }
        })
      );
      
      expect(result.success).toBe(true);
      expect(result.documentId).toBe('test-doc-id');
    });
  });

  describe('retrieve_knowledge_context tool', () => {
    it('should retrieve and format knowledge', async () => {
      const tools = kmTools.getTools();
      const retrieveKnowledgeTool = tools.find(t => t.name === 'retrieve_knowledge_context');
      
      expect(retrieveKnowledgeTool).toBeDefined();
      
      const result = await retrieveKnowledgeTool!.handler({
        query: 'test query',
        domains: ['test-domain'],
        knowledgeTypes: ['best_practice']
      });
      
      expect(dbServiceMock.search).toHaveBeenCalledWith('test query', 5, 0.7);
      
      expect(result.relevantKnowledge).toHaveLength(1);
      expect(result.relevantKnowledge[0].content).toBe('Test knowledge 1');
      expect(result.relevantKnowledge[0].domain).toBe('test-domain');
    });
    
    it('should apply filters correctly', async () => {
      const tools = kmTools.getTools();
      const retrieveKnowledgeTool = tools.find(t => t.name === 'retrieve_knowledge_context');
      
      const result = await retrieveKnowledgeTool!.handler({
        query: 'test query',
        options: {
          maxResults: 10,
          minConfidence: 0.8,
          includeContext: false
        }
      });
      
      expect(dbServiceMock.search).toHaveBeenCalledWith('test query', 10, 0.8);
      expect(result.relevantKnowledge).toHaveLength(2);
      expect(result.relevantKnowledge[0]).not.toHaveProperty('context');
    });
  });
}); 