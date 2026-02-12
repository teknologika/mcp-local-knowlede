/**
 * Knowledge base service for CRUD operations
 * Manages knowledge base metadata, statistics, and lifecycle operations
 */

import type { 
  KnowledgeBaseMetadata, 
  KnowledgeBaseStats, 
  ChunkTypeStats,
  Config 
} from '../../shared/types/index.js';
import { LanceDBClientWrapper } from '../../infrastructure/lancedb/lancedb.client.js';
import { createLogger } from '../../shared/logging/index.js';

const rootLogger = createLogger('info');
const logger = rootLogger.child('KnowledgeBaseService');

/**
 * Error thrown when knowledge base operations fail
 */
export class KnowledgeBaseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'KnowledgeBaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Service for managing knowledge bases
 */
export class KnowledgeBaseService {
  private lanceClient: LanceDBClientWrapper;

  constructor(lanceClient: LanceDBClientWrapper, _config: Config) {
    this.lanceClient = lanceClient;
  }

  /**
   * List all knowledge bases with metadata
   */
  async listKnowledgeBases(): Promise<KnowledgeBaseMetadata[]> {
    try {
      logger.debug('Listing all knowledge bases');

      const tables = await this.lanceClient.listTables();
      const knowledgeBases: KnowledgeBaseMetadata[]  = [];

      for (const table of tables) {
        const metadata = table.metadata;
        
        // Only include tables that are knowledge base tables
        if (!metadata?.knowledgeBaseName) {
          continue;
        }

        const knowledgeBaseName = metadata.knowledgeBaseName as string;
        
        // Open table directly by name
        const lanceTable = await this.lanceClient.getConnection().openTable(table.name);
        const count = await lanceTable.countRows();
        
        // Extract metadata from first row if available
        let path = '';
        let fileCount = 0;
        let lastIngestion = '';

        try {
          const sample = await lanceTable.query().limit(1).toArray();
          if (sample.length > 0) {
            const firstRow = sample[0];
            path = firstRow._path || '';
            lastIngestion = firstRow._lastIngestion || firstRow._createdAt || '';
            
            // Get unique file count from all rows
            const allRows = await lanceTable.query().select(['filePath']).toArray();
            const uniqueFiles = new Set<string>();
            
            for (const row of allRows) {
              if (row.filePath) uniqueFiles.add(row.filePath);
            }
            
            fileCount = uniqueFiles.size;
          }
        } catch (error) {
          // Silently ignore metadata errors - table may be corrupted or incompatible
          // This is not critical for listing knowledge bases
        }

        knowledgeBases.push({
          name: knowledgeBaseName,
          path,
          chunkCount: count,
          fileCount,
          lastIngestion,
        });
      }

      logger.debug('Knowledge bases listed successfully', { count: knowledgeBases.length });
      return knowledgeBases;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to list knowledge bases',
        error instanceof Error ? error : new Error(errorMessage)
      );
      throw new KnowledgeBaseError(
        `Failed to list knowledge bases: ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Get detailed statistics for a knowledge base
   */
  async getKnowledgeBaseStats(name: string): Promise<KnowledgeBaseStats> {
    try {
      logger.debug('Getting knowledge base statistics', { knowledgeBaseName: name });

      const table = await this.lanceClient.getOrCreateTable(name);
      if (!table) {
        throw new KnowledgeBaseError(`Knowledge base '${name}' not found`);
      }
      
      // Get all rows to calculate statistics
      const rows = await table.query().toArray();
      
      const chunkCount = rows.length;

      // Calculate statistics
      const chunkTypeMap = new Map<string, number>();
      const fileSet = new Set<string>();
      let totalSize = 0;
      let path = '';
      let lastIngestion = '';

      for (const row of rows) {
        const filePath = row.filePath || '';
        const chunkType = row.chunkType || 'unknown';
        const content = row.content || '';

        // Get metadata from first row
        if (!path && row._path) path = row._path;
        if (!lastIngestion && (row._lastIngestion || row._createdAt)) {
          lastIngestion = row._lastIngestion || row._createdAt;
        }

        fileSet.add(filePath);
        totalSize += content.length;

        // Track chunk type stats
        chunkTypeMap.set(chunkType, (chunkTypeMap.get(chunkType) || 0) + 1);
      }

      // Convert to arrays
      const chunkTypes: ChunkTypeStats[] = Array.from(chunkTypeMap.entries()).map(
        ([type, count]) => ({
          type,
          count,
        })
      );

      const stats: KnowledgeBaseStats = {
        name,
        path,
        chunkCount,
        fileCount: fileSet.size,
        lastIngestion,
        chunkTypes,
        sizeBytes: totalSize,
      };

      logger.debug('Knowledge base statistics retrieved successfully', {
        knowledgeBaseName: name,
        chunkCount,
        fileCount: fileSet.size,
      });

      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to get knowledge base statistics',
        error instanceof Error ? error : new Error(errorMessage),
        { knowledgeBaseName: name }
      );
      throw new KnowledgeBaseError(
        `Failed to get statistics for knowledge base '${name}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Rename a knowledge base and propagate to all chunk metadata
   */
  async renameKnowledgeBase(oldName: string, newName: string): Promise<void> {
    try {
      logger.debug('Renaming knowledge base', { oldName, newName });

      // Get the old table
      const oldTable = await this.lanceClient.getOrCreateTable(oldName);
      if (!oldTable) {
        throw new KnowledgeBaseError(`Knowledge base '${oldName}' not found`);
      }
      
      // Get all rows from old table
      const rows = await oldTable.query().toArray();

      if (rows.length === 0) {
        logger.warn('No chunks found in knowledge base to rename', { oldName });
      }

      // Update knowledgeBaseName in all rows
      const updatedRows = rows.map((row: any) => ({
        ...row,
        _knowledgeBaseName: newName,
        _renamedFrom: oldName,
        _renamedAt: new Date().toISOString(),
      }));

      // Create new table with updated data
      if (updatedRows.length > 0) {
        await this.lanceClient.createTableWithData(newName, updatedRows);
      }

      // Delete old table
      await this.lanceClient.deleteTable(oldName);

      logger.debug('Knowledge base renamed successfully', {
        oldName,
        newName,
        chunksUpdated: rows.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to rename knowledge base',
        error instanceof Error ? error : new Error(errorMessage),
        { oldName, newName }
      );
      throw new KnowledgeBaseError(
        `Failed to rename knowledge base from '${oldName}' to '${newName}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Delete a knowledge base and all its chunks
   */
  async deleteKnowledgeBase(name: string): Promise<void> {
    try {
      logger.debug('Deleting knowledge base', { knowledgeBaseName: name });

      await this.lanceClient.deleteTable(name);

      logger.debug('Knowledge base deleted successfully', { knowledgeBaseName: name });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to delete knowledge base',
        error instanceof Error ? error : new Error(errorMessage),
        { knowledgeBaseName: name }
      );
      throw new KnowledgeBaseError(
        `Failed to delete knowledge base '${name}': ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Delete chunks from a specific ingestion timestamp
   */
  async deleteChunkSet(knowledgeBaseName: string, timestamp: string): Promise<number> {
    try {
      logger.debug('Deleting chunk set', { knowledgeBaseName, timestamp });

      const table = await this.lanceClient.getOrCreateTable(knowledgeBaseName);
      if (!table) {
        throw new KnowledgeBaseError(`Knowledge base '${knowledgeBaseName}' not found`);
      }

      // Count chunks with the specified timestamp
      const rows = await table.query()
        .where(`ingestionTimestamp = '${timestamp}'`)
        .toArray();

      const chunkCount = rows.length;

      if (chunkCount === 0) {
        logger.warn('No chunks found with specified timestamp', {
          knowledgeBaseName,
          timestamp,
        });
        return 0;
      }

      // Delete the chunks
      await table.delete(`ingestionTimestamp = '${timestamp}'`);

      logger.debug('Chunk set deleted successfully', {
        knowledgeBaseName,
        timestamp,
        chunksDeleted: chunkCount,
      });

      return chunkCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to delete chunk set',
        error instanceof Error ? error : new Error(errorMessage),
        { knowledgeBaseName, timestamp }
      );
      throw new KnowledgeBaseError(
        `Failed to delete chunk set for knowledge base '${knowledgeBaseName}' at timestamp '${timestamp}': ${errorMessage}`,
        error
      );
    }
  }
}
