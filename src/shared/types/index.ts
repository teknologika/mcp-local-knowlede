/**
 * Shared type definitions for the codebase memory MCP server
 */

/**
 * Types of code chunks that can be extracted
 */
export type ChunkType = "function" | "class" | "method" | "interface" | "property" | "field";

/**
 * Log levels for structured logging
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Configuration interface for the entire system
 */
export interface Config {
  lancedb: {
    persistPath: string;
  };
  embedding: {
    modelName: string;
    cachePath: string;
  };
  server: {
    port: number;
    host: string;
    sessionSecret?: string;
  };
  mcp: {
    transport: "stdio";
  };
  ingestion: {
    batchSize: number;
    maxFileSize: number;
  };
  search: {
    defaultMaxResults: number;
    cacheTimeoutSeconds: number;
  };
  document: {
    conversionTimeout: number;
    maxTokens: number;
    chunkSize: number;
    chunkOverlap: number;
  };
  logging: {
    level: LogLevel;
  };
  schemaVersion: string;
}

/**
 * Code chunk with metadata
 */
export interface Chunk {
  content: string;
  startLine: number;
  endLine: number;
  chunkType: ChunkType;
  filePath: string;
  isTestFile?: boolean;
}

/**
 * Codebase metadata
 */
export interface KnowledgeBaseMetadata {
  name: string;
  path: string;
  chunkCount: number;
  fileCount: number;
  lastIngestion: string; // ISO 8601 timestamp
}

/**
 * Search result
 */
export interface SearchResult {
  filePath: string;
  startLine: number;
  endLine: number;
  chunkType: string;
  content: string;
  similarityScore: number;
  knowledgeBaseName: string;
}

/**
 * Search parameters
 */
export interface SearchParams {
  query: string;
  knowledgeBaseName?: string;
  maxResults?: number;
  excludeTests?: boolean;
}

/**
 * Search results
 */
export interface SearchResults {
  results: SearchResult[];
  totalResults: number;
  queryTime: number;
}

/**
 * Chunk type statistics
 */
export interface ChunkTypeStats {
  type: string;
  count: number;
}

/**
 * Detailed codebase statistics
 */
export interface KnowledgeBaseStats {
  name: string;
  path: string;
  chunkCount: number;
  fileCount: number;
  lastIngestion: string;
  chunkTypes: ChunkTypeStats[];
  sizeBytes: number;
}

/**
 * Ingestion parameters
 */
export interface IngestionParams {
  path: string;
  name: string;
  config: Config;
  respectGitignore?: boolean;
}

/**
 * Ingestion statistics
 */
export interface IngestionStats {
  totalFiles: number;
  supportedFiles: number;
  unsupportedFiles: Map<string, number>;
  chunksCreated: number;
  durationMs: number;
}
