/**
 * Unit tests for KnowledgeBaseService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeBaseService, KnowledgeBaseError } from '../codebase.service.js';
import { LanceDBClientWrapper } from '../../../infrastructure/lancedb/lancedb.client.js';
import type { Config } from '../../../shared/types/index.js';
import { DEFAULT_CONFIG } from '../../../shared/config/config.js';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let mockLanceClient: LanceDBClientWrapper;
  let config: Config;

  beforeEach(() => {
    config = { ...DEFAULT_CONFIG };
    
    // Create mock LanceDB client
    mockLanceClient = {
      listTables: vi.fn(),
      getOrCreateTable: vi.fn(),
      tableExists: vi.fn(),
      deleteTable: vi.fn(),
    } as any;

    service = new KnowledgeBaseService(mockLanceClient, config);
  });

  describe('listKnowledgeBases', () => {
    it('should return empty array when no tables exist', async () => {
      vi.mocked(mockLanceClient.listTables).mockResolvedValue([]);

      const result = await service.listKnowledgeBases();

      expect(result).toEqual([]);
      expect(mockLanceClient.listTables).toHaveBeenCalledOnce();
    });

    it('should return knowledge bases with metadata', async () => {
      const mockTables = [
        {
          name: 'knowledgebase_test-project_1_0_0',
          metadata: {
            knowledgeBaseName: 'test-project',
            path: '/path/to/project',
            fileCount: 10,
            lastIngestion: '2024-01-01T00:00:00Z',
            languages: ['typescript', 'javascript'],
          },
        },
      ];

      const mockTable = {
        countRows: vi.fn().mockResolvedValue(50),
        query: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              {
                _path: '/path/to/project',
                _lastIngestion: '2024-01-01T00:00:00Z',
                language: 'typescript',
                filePath: '/path/to/file1.ts',
              },
            ]),
          }),
          select: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              { language: 'typescript', filePath: '/path/to/file1.ts' },
              { language: 'typescript', filePath: '/path/to/file2.ts' },
              { language: 'javascript', filePath: '/path/to/file3.js' },
              { language: 'javascript', filePath: '/path/to/file4.js' },
              { language: 'javascript', filePath: '/path/to/file5.js' },
              { language: 'javascript', filePath: '/path/to/file6.js' },
              { language: 'javascript', filePath: '/path/to/file7.js' },
              { language: 'javascript', filePath: '/path/to/file8.js' },
              { language: 'javascript', filePath: '/path/to/file9.js' },
              { language: 'javascript', filePath: '/path/to/file10.js' },
            ]),
          }),
        }),
      };

      vi.mocked(mockLanceClient.listTables).mockResolvedValue(mockTables);
      vi.mocked(mockLanceClient.getOrCreateTable).mockResolvedValue(mockTable as any);

      const result = await service.listKnowledgeBases();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'test-project',
        path: '/path/to/project',
        chunkCount: 50,
        fileCount: 10,
        lastIngestion: '2024-01-01T00:00:00Z',
        languages: ['typescript', 'javascript'],
      });
    });

    it('should skip tables without knowledgeBaseName metadata', async () => {
      const mockTables = [
        {
          name: 'some-other-table',
          metadata: {},
        },
      ];

      vi.mocked(mockLanceClient.listTables).mockResolvedValue(mockTables);

      const result = await service.listKnowledgeBases();

      expect(result).toEqual([]);
    });

    it('should throw KnowledgeBaseError on failure', async () => {
      vi.mocked(mockLanceClient.listTables).mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(service.listKnowledgeBases()).rejects.toThrow(KnowledgeBaseError);
      await expect(service.listKnowledgeBases()).rejects.toThrow('Failed to list knowledge bases');
    });
  });

  describe('deleteKnowledgeBase', () => {
    it('should delete knowledge base table', async () => {
      vi.mocked(mockLanceClient.deleteTable).mockResolvedValue();

      await service.deleteKnowledgeBase('test-project');

      expect(mockLanceClient.deleteTable).toHaveBeenCalledWith('test-project');
    });

    it('should throw KnowledgeBaseError on deletion failure', async () => {
      vi.mocked(mockLanceClient.deleteTable).mockRejectedValue(
        new Error('Delete failed')
      );

      await expect(service.deleteKnowledgeBase('test-project')).rejects.toThrow(KnowledgeBaseError);
    });
  });

  describe('deleteChunkSet', () => {
    it('should delete chunks with specific timestamp', async () => {
      const mockTable = {
        query: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([{}, {}, {}]), // 3 chunks
          }),
        }),
        delete: vi.fn().mockResolvedValue(3),
      };

      vi.mocked(mockLanceClient.getOrCreateTable).mockResolvedValue(mockTable as any);

      const result = await service.deleteChunkSet('test-project', '2024-01-01T00:00:00Z');

      expect(result).toBe(3);
      expect(mockTable.delete).toHaveBeenCalledWith("ingestionTimestamp = '2024-01-01T00:00:00Z'");
    });

    it('should return 0 when no chunks found', async () => {
      const mockTable = {
        query: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]), // No chunks
          }),
        }),
        delete: vi.fn(),
      };

      vi.mocked(mockLanceClient.getOrCreateTable).mockResolvedValue(mockTable as any);

      const result = await service.deleteChunkSet('test-project', '2024-01-01T00:00:00Z');

      expect(result).toBe(0);
      expect(mockTable.delete).not.toHaveBeenCalled();
    });
  });
});
