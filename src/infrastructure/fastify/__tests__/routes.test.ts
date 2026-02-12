/**
 * Unit tests for Fastify API routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerRoutes } from '../routes.js';
import type { KnowledgeBaseService } from '../../../domains/knowledgebase/codebase.service.js';
import type { SearchService } from '../../../domains/search/search.service.js';
import type {
  KnowledgeBaseMetadata,
  KnowledgeBaseStats,
  SearchResults,
} from '../../../shared/types/index.js';

describe('Fastify API Routes', () => {
  let fastify: FastifyInstance;
  let mockKnowledgeBaseService: KnowledgeBaseService;
  let mockSearchService: SearchService;

  beforeEach(async () => {
    // Create fresh Fastify instance for each test
    fastify = Fastify({ logger: false });

    // Create mock services
    mockKnowledgeBaseService = {
      listKnowledgeBases: vi.fn(),
      getKnowledgeBaseStats: vi.fn(),
      renameKnowledgeBase: vi.fn(),
      deleteKnowledgeBase: vi.fn(),
      deleteChunkSet: vi.fn(),
    } as any;

    mockSearchService = {
      search: vi.fn(),
    } as any;

    // Register routes
    await registerRoutes(fastify, mockKnowledgeBaseService, mockSearchService);
  });

  describe('GET /api/codebases', () => {
    it('should return list of knowledge bases', async () => {
      const mockKnowledgeBases: KnowledgeBaseMetadata[] = [
        {
          name: 'test-knowledgebase',
          path: '/path/to/knowledgebase',
          chunkCount: 100,
          fileCount: 10,
          lastIngestion: '2024-01-01T00:00:00Z',
          languages: ['typescript', 'javascript'],
        },
      ];

      vi.mocked(mockKnowledgeBaseService.listKnowledgeBases).mockResolvedValue(mockKnowledgeBases);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/codebases',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.codebases).toEqual(mockKnowledgeBases);
      expect(mockKnowledgeBaseService.listKnowledgeBases).toHaveBeenCalledOnce();
    });

    it('should return 500 on service error', async () => {
      vi.mocked(mockKnowledgeBaseService.listKnowledgeBases).mockRejectedValue(
        new Error('Database error')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/codebases',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('Failed to list codebases');
    });
  });

  describe('POST /api/search', () => {
    it('should return search results with valid query', async () => {
      const mockResults: SearchResults = {
        results: [
          {
            filePath: '/path/to/file.ts',
            startLine: 10,
            endLine: 20,
            language: 'typescript',
            chunkType: 'function',
            content: 'function test() {}',
            similarityScore: 0.95,
            knowledgeBaseName: 'test-knowledgebase',
          },
        ],
        totalResults: 1,
        queryTime: 50,
      };

      vi.mocked(mockSearchService.search).mockResolvedValue(mockResults);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/search',
        payload: {
          query: 'test function',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual(mockResults);
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: 'test function',
      });
    });

    it('should accept optional filters', async () => {
      const mockResults: SearchResults = {
        results: [],
        totalResults: 0,
        queryTime: 10,
      };

      vi.mocked(mockSearchService.search).mockResolvedValue(mockResults);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/search',
        payload: {
          query: 'test',
          knowledgeBaseName: 'my-knowledgebase',
          language: 'typescript',
          maxResults: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: 'test',
        knowledgeBaseName: 'my-knowledgebase',
        language: 'typescript',
        maxResults: 10,
      });
    });

    it('should return 400 for missing query', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/search',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid search parameters');
    });

    it('should return 400 for empty query', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/search',
        payload: {
          query: '',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid maxResults', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/search',
        payload: {
          query: 'test',
          maxResults: -1,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 on search error', async () => {
      vi.mocked(mockSearchService.search).mockRejectedValue(
        new Error('Search failed')
      );

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/search',
        payload: {
          query: 'test',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/codebases/:name/stats', () => {
    it('should return knowledge base statistics', async () => {
      const mockStats: KnowledgeBaseStats = {
        name: 'test-knowledgebase',
        path: '/path/to/knowledgebase',
        chunkCount: 100,
        fileCount: 10,
        lastIngestion: '2024-01-01T00:00:00Z',
        languages: [
          { language: 'typescript', fileCount: 8, chunkCount: 80 },
          { language: 'javascript', fileCount: 2, chunkCount: 20 },
        ],
        chunkTypes: [
          { type: 'function', count: 60 },
          { type: 'class', count: 40 },
        ],
        sizeBytes: 50000,
      };

      vi.mocked(mockKnowledgeBaseService.getKnowledgeBaseStats).mockResolvedValue(mockStats);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/codebases/test-knowledgebase/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual(mockStats);
      expect(mockKnowledgeBaseService.getKnowledgeBaseStats).toHaveBeenCalledWith('test-knowledgebase');
    });

    it('should return 404 for non-existent knowledge base', async () => {
      vi.mocked(mockKnowledgeBaseService.getKnowledgeBaseStats).mockRejectedValue(
        new Error('Knowledge base not found')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/codebases/non-existent/stats',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 500 on service error', async () => {
      vi.mocked(mockKnowledgeBaseService.getKnowledgeBaseStats).mockRejectedValue(
        new Error('Database error')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/codebases/test-knowledgebase/stats',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PUT /api/codebases/:name', () => {
    it('should rename knowledge base successfully', async () => {
      vi.mocked(mockKnowledgeBaseService.renameKnowledgeBase).mockResolvedValue(undefined);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/codebases/old-name',
        payload: {
          newName: 'new-name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('old-name');
      expect(body.message).toContain('new-name');
      expect(mockKnowledgeBaseService.renameKnowledgeBase).toHaveBeenCalledWith(
        'old-name',
        'new-name'
      );
    });

    it('should return 400 for missing newName', async () => {
      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/codebases/old-name',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent knowledge base', async () => {
      vi.mocked(mockKnowledgeBaseService.renameKnowledgeBase).mockRejectedValue(
        new Error('Knowledge base not found')
      );

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/codebases/non-existent',
        payload: {
          newName: 'new-name',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 500 on service error', async () => {
      vi.mocked(mockKnowledgeBaseService.renameKnowledgeBase).mockRejectedValue(
        new Error('Database error')
      );

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/codebases/old-name',
        payload: {
          newName: 'new-name',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('DELETE /api/codebases/:name', () => {
    it('should delete knowledge base successfully', async () => {
      vi.mocked(mockKnowledgeBaseService.deleteKnowledgeBase).mockResolvedValue(undefined);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/codebases/test-knowledgebase',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('test-knowledgebase');
      expect(mockKnowledgeBaseService.deleteKnowledgeBase).toHaveBeenCalledWith('test-knowledgebase');
    });

    it('should return 404 for non-existent knowledge base', async () => {
      vi.mocked(mockKnowledgeBaseService.deleteKnowledgeBase).mockRejectedValue(
        new Error('Knowledge base not found')
      );

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/codebases/non-existent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 500 on service error', async () => {
      vi.mocked(mockKnowledgeBaseService.deleteKnowledgeBase).mockRejectedValue(
        new Error('Database error')
      );

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/codebases/test-knowledgebase',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('DELETE /api/codebases/:name/chunk-sets/:timestamp', () => {
    it('should delete chunk set successfully', async () => {
      vi.mocked(mockKnowledgeBaseService.deleteChunkSet).mockResolvedValue(50);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/codebases/test-knowledgebase/chunk-sets/2024-01-01T00:00:00Z',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.chunksDeleted).toBe(50);
      expect(body.message).toContain('50');
      expect(mockKnowledgeBaseService.deleteChunkSet).toHaveBeenCalledWith(
        'test-knowledgebase',
        '2024-01-01T00:00:00Z'
      );
    });

    it('should return 404 for non-existent knowledge base', async () => {
      vi.mocked(mockKnowledgeBaseService.deleteChunkSet).mockRejectedValue(
        new Error('Knowledge base not found')
      );

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/codebases/non-existent/chunk-sets/2024-01-01T00:00:00Z',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 500 on service error', async () => {
      vi.mocked(mockKnowledgeBaseService.deleteChunkSet).mockRejectedValue(
        new Error('Database error')
      );

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/codebases/test-knowledgebase/chunk-sets/2024-01-01T00:00:00Z',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
