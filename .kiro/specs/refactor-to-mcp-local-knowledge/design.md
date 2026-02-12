# Design Document: Refactor to mcp-local-knowledge

## Overview

This design document describes the architecture and implementation approach for refactoring `@teknologika/mcp-codebase-search` into `@teknologika/mcp-local-knowledge`. The refactoring transforms a code-focused semantic search tool into a general-purpose document knowledge base system.

### Key Design Decisions

1. **Use docling-sdk (TypeScript)**: Instead of building a Python bridge with uvx, we use the `docling-sdk` npm package which provides TypeScript-native integration with Python Docling
2. **Single npm package**: No separate PyPI package needed - docling-sdk handles the Python integration
3. **CLI mode for Docling**: Use docling-sdk's CLI mode which wraps Python Docling for full feature support
4. **HybridChunker with fallback**: Primary chunking uses Docling's HybridChunker; fallback to simple text chunking if it fails
5. **Remove all code-specific features**: Complete removal of tree-sitter, language detection, and code parsing
6. **Maintain local-first architecture**: All processing remains local, no cloud dependencies
7. **Preserve existing infrastructure**: Keep LanceDB, local embeddings, MCP server, and Manager UI

### Architecture Principles

- **Separation of concerns**: Document processing, search, and UI are independent domains
- **Fail-safe design**: Fallback mechanisms for document conversion and chunking
- **Progressive enhancement**: Manager UI works without JavaScript, enhanced with it
- **Type safety**: Strict TypeScript throughout with comprehensive interfaces
- **Testability**: Dependency injection and clear interfaces enable comprehensive testing

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interfaces                          │
├─────────────────────────────────────────────────────────────────┤
│  MCP Server (stdio)  │  Ingestion CLI  │  Manager UI (Web)     │
│                      │                  │  (localhost only)     │
└──────────┬───────────┴────────┬─────────┴──────────┬───────────┘
           │                    │                     │
           ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Domain Services                           │
├─────────────────────────────────────────────────────────────────┤
│  KnowledgeBase  │  Search  │  Ingestion  │  Document  │ Embed  │
└──────────┬──────┴────┬─────┴──────┬──────┴─────┬─────┴────┬────┘
           │           │            │            │          │
           ▼           ▼            ▼            ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  LanceDB  │  docling-sdk  │  HuggingFace Transformers  │ Fastify│
└───────────┴───────────────┴────────────────────────────┴────────┘
           │                │                    │
           ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        External Systems                          │
├─────────────────────────────────────────────────────────────────┤
│  File System  │  Python Docling (via docling-sdk)  │  Models   │
└───────────────┴─────────────────────────────────────┴───────────┘
```

**Important Architectural Constraints:**
- **Manager UI**: Browser-based interface served by Fastify on localhost. Since it runs locally, the UI can directly access backend services and database without security concerns. This is appropriate for a local-first tool.
- **MCP Server & CLI**: Server-side components that directly invoke domain services.
- **Fastify Server**: Serves the Manager UI and provides REST API endpoints that access domain services.

### Component Interaction Flow

**Document Ingestion Flow:**
```
User → Ingestion CLI
  → File Scanner (scan directory)
  → Document Converter (docling-sdk → Python Docling → markdown)
  → Document Chunker (HybridChunker → chunks)
  → Embedding Service (generate embeddings)
  → LanceDB (store chunks + embeddings)
```

**Search Flow:**
```
User → MCP Server / Manager UI
  → Search Service (query)
  → Embedding Service (query embedding)
  → LanceDB (vector similarity search)
  → Search Service (format results)
  → User (results with metadata)
```

**File Upload Flow:**
```
User → Manager UI (drag & drop, client-side JavaScript)
  → HTTP POST to Fastify Server (multipart upload)
  → Fastify Route Handler (validate, save temp files)
  → Ingestion Service (process files via domain service)
  → LanceDB (store chunks, via LanceDBClient)
  → Progress Tracking (SSE stream back to UI)
  → Manager UI (display progress, completion notification)

Note: Since Manager UI runs on localhost, it can directly access
backend services and database. This is necessary for local-first tools, that encounter techical issues when trying to access services and running on localhost.
```

## Components and Interfaces

### 1. Document Domain

#### DocumentConverterService

**Purpose**: Convert various document formats to markdown using docling-sdk

**Interface**:
```typescript
interface DocumentConverterService {
  convertDocument(filePath: string): Promise<DocumentConversionResult>;
  getSupportedFormats(): string[];
}

interface DocumentConversionResult {
  markdown: string;
  metadata: DocumentMetadata;
  doclingDocument?: any; // For HybridChunker
}

interface DocumentMetadata {
  title: string;
  format: string;
  pageCount?: number;
  wordCount: number;
  hasImages: boolean;
  hasTables: boolean;
  conversionDuration?: number;
}
```

**Implementation Details**:
- Initialize Docling client in CLI mode: `new Docling({ cli: { outputDir: './temp' } })`
- Call `client.convert(filePath, basename, { to_formats: ['md', 'json'] })`
- Extract metadata from conversion result
- Handle timeouts (30 seconds default)
- Implement fallback to simple text extraction on failure
- Clean up temporary files after conversion

**Error Handling**:
- Timeout after 30 seconds → return error with partial content if available
- Unsupported format → return descriptive error
- Docling not installed → return error with installation instructions
- File not found → return error with file path

#### DocumentChunkerService

**Purpose**: Split documents into semantic chunks using HybridChunker

**Interface**:
```typescript
interface DocumentChunkerService {
  chunkDocument(content: string, options: ChunkingOptions): Promise<DocumentChunk[]>;
  chunkWithDocling(doclingDoc: any, options: ChunkingOptions): Promise<DocumentChunk[]>;
}

interface ChunkingOptions {
  maxTokens?: number;        // Default: 512
  chunkSize?: number;        // Fallback: 1000
  chunkOverlap?: number;     // Fallback: 200
  mergePeers?: boolean;      // Default: true
}

interface DocumentChunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata: ChunkMetadata;
}

interface ChunkMetadata {
  chunkType: ChunkType;      // paragraph, section, table, heading
  hasContext: boolean;       // true if contextualized
  headingPath?: string[];    // heading hierarchy
  pageNumber?: number;
}

type ChunkType = 'paragraph' | 'section' | 'table' | 'heading' | 'list' | 'code';
```

**Implementation Details**:
- Primary: Use docling-sdk's chunking: `client.chunk(content, { max_tokens, chunker_type: 'hybrid' })`
- Fallback: Simple text chunking with overlap
- Preserve document structure (headings, sections)
- Include heading hierarchy as context
- Calculate token count for each chunk
- Assign appropriate chunk type based on content

**Error Handling**:
- HybridChunker fails → fallback to simple chunking
- Empty content → return empty array
- Invalid options → use defaults

### 2. KnowledgeBase Domain

#### KnowledgeBaseService

**Purpose**: Manage knowledge base lifecycle and metadata

**Interface**:
```typescript
interface KnowledgeBaseService {
  createKnowledgeBase(name: string, path: string): Promise<KnowledgeBase>;
  getKnowledgeBase(name: string): Promise<KnowledgeBase | null>;
  listKnowledgeBases(): Promise<KnowledgeBase[]>;
  deleteKnowledgeBase(name: string): Promise<void>;
  getStats(name: string): Promise<KnowledgeBaseStats>;
  renameKnowledgeBase(oldName: string, newName: string): Promise<void>;
}

interface KnowledgeBase {
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  documentCount: number;
  chunkCount: number;
  version: string;
}

interface KnowledgeBaseStats {
  name: string;
  documentCount: number;
  chunkCount: number;
  totalSize: number;
  documentTypes: Record<DocumentType, number>;
  lastUpdated: Date;
  averageChunkSize: number;
}

type DocumentType = 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'html' | 'markdown' | 'text' | 'audio';
```

**Implementation Details**:
- Store metadata in LanceDB metadata table
- Track document counts and types
- Maintain version for schema evolution
- Use table naming: `kb_{name}_{version}`
- Validate knowledge base names (alphanumeric, hyphens, underscores)

### 3. Ingestion Domain

#### IngestionService

**Purpose**: Orchestrate document ingestion pipeline

**Interface**:
```typescript
interface IngestionService {
  ingestDirectory(options: IngestionOptions): Promise<IngestionResult>;
  ingestFiles(files: string[], knowledgeBaseName: string): Promise<IngestionResult>;
  getProgress(sessionId: string): IngestionProgress;
}

interface IngestionOptions {
  path: string;
  knowledgeBaseName: string;
  batchSize?: number;
  maxFileSize?: number;
  excludePatterns?: string[];
}

interface IngestionResult {
  filesProcessed: number;
  filesSkipped: number;
  chunksCreated: number;
  errors: IngestionError[];
  duration: number;
}

interface IngestionProgress {
  sessionId: string;
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  status: 'scanning' | 'processing' | 'completed' | 'failed';
  errors: IngestionError[];
}

interface IngestionError {
  filePath: string;
  error: string;
  timestamp: Date;
}
```

**Implementation Details**:
- Scan directory for document files
- Respect .gitignore patterns
- Process files in batches (default: 100)
- For each file:
  1. Convert to markdown (DocumentConverter)
  2. Chunk markdown (DocumentChunker)
  3. Generate embeddings (EmbeddingService)
  4. Store in LanceDB
- Track progress for UI updates
- Continue on errors, collect error list
- Report comprehensive statistics

#### FileScannerService

**Purpose**: Scan directories and classify document files

**Interface**:
```typescript
interface FileScannerService {
  scanDirectory(path: string, options: ScanOptions): Promise<FileInfo[]>;
  classifyFile(filePath: string): FileClassification;
}

interface ScanOptions {
  excludePatterns?: string[];
  maxFileSize?: number;
  followSymlinks?: boolean;
}

interface FileInfo {
  path: string;
  relativePath: string;
  size: number;
  documentType: DocumentType;
  isTest: boolean;
  modifiedAt: Date;
}

interface FileClassification {
  documentType: DocumentType;
  isTest: boolean;
  isSupported: boolean;
}
```

**Implementation Details**:
- Recursively scan directories
- Detect document type by extension
- Check for test files (path contains "test" or "spec")
- Respect .gitignore patterns
- Skip files exceeding maxFileSize
- Return sorted file list

### 4. Search Domain

#### SearchService

**Purpose**: Perform semantic search across knowledge bases

**Interface**:
```typescript
interface SearchService {
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  clearCache(): void;
}

interface SearchOptions {
  knowledgeBaseName: string;
  maxResults?: number;
  documentType?: DocumentType;
  excludeTests?: boolean;
  minScore?: number;
}

interface SearchResult {
  content: string;
  score: number;
  metadata: SearchResultMetadata;
}

interface SearchResultMetadata {
  filePath: string;
  documentType: DocumentType;
  chunkType: ChunkType;
  chunkIndex: number;
  isTest: boolean;
  pageNumber?: number;
  headingPath?: string[];
}
```

**Implementation Details**:
- Generate query embedding
- Perform vector similarity search in LanceDB
- Apply filters (documentType, excludeTests)
- Sort by similarity score
- Cache results for 60 seconds
- Return formatted results with metadata

### 5. Embedding Domain

#### EmbeddingService

**Purpose**: Generate vector embeddings for text

**Interface**:
```typescript
interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getModelInfo(): ModelInfo;
}

interface ModelInfo {
  name: string;
  dimensions: number;
  maxTokens: number;
}
```

**Implementation Details**:
- Use @huggingface/transformers
- Default model: "Xenova/all-MiniLM-L6-v2"
- Cache model in ~/.knowledge-base/models/
- Batch processing for efficiency
- Normalize embeddings

### 6. Infrastructure Layer

#### LanceDBClient

**Purpose**: Manage vector database operations

**Interface**:
```typescript
interface LanceDBClient {
  createTable(name: string, schema: Schema): Promise<Table>;
  getTable(name: string): Promise<Table | null>;
  listTables(): Promise<string[]>;
  deleteTable(name: string): Promise<void>;
  insertChunks(tableName: string, chunks: ChunkRecord[]): Promise<void>;
  searchSimilar(tableName: string, embedding: number[], limit: number): Promise<SearchResult[]>;
}

interface ChunkRecord {
  id: string;
  content: string;
  embedding: number[];
  filePath: string;
  documentType: DocumentType;
  chunkType: ChunkType;
  chunkIndex: number;
  tokenCount: number;
  isTest: boolean;
  metadata: Record<string, any>;
}
```

**Implementation Details**:
- Connect to LanceDB at ~/.knowledge-base/lancedb/
- Use table naming: kb_{name}_{version}
- Create indexes for fast similarity search
- Support batch inserts
- Handle schema evolution

#### MCPServer

**Purpose**: Expose tools via Model Context Protocol

**Interface**:
```typescript
interface MCPServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  registerTool(tool: MCPTool): void;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (params: any) => Promise<any>;
}
```

**Tools**:
1. `list_knowledgebases`: List all knowledge bases
2. `search_knowledgebases`: Search across knowledge bases
3. `get_knowledgebase_stats`: Get statistics for a knowledge base
4. `open_knowledgebase_manager`: Open Manager UI in browser

**Implementation Details**:
- Use @modelcontextprotocol/sdk
- stdio transport for Claude Desktop integration
- Validate inputs with JSON schemas
- Return structured responses
- Handle errors gracefully

#### FastifyServer

**Purpose**: Serve Manager UI and API endpoints

**Architecture Note**: The Manager UI maintains its current architecture where it communicates with backend services exclusively through the Fastify REST API. The UI does not directly access LanceDB or any other infrastructure components. All database operations are performed server-side through domain services.

**Routes**:
- `GET /`: Manager UI home page
- `GET /api/knowledgebases`: List knowledge bases (via KnowledgeBaseService)
- `GET /api/knowledgebases/:name`: Get knowledge base details (via KnowledgeBaseService)
- `GET /api/knowledgebases/:name/stats`: Get statistics (via KnowledgeBaseService)
- `POST /api/knowledgebases`: Create knowledge base (via KnowledgeBaseService)
- `DELETE /api/knowledgebases/:name`: Delete knowledge base (via KnowledgeBaseService)
- `POST /api/search`: Search knowledge bases (via SearchService)
- `POST /api/upload/file`: Upload single file (via IngestionService)
- `POST /api/upload/folder`: Upload folder (via IngestionService)
- `GET /api/upload/progress/:sessionId`: SSE progress stream (via IngestionService)

**Implementation Details**:
- Use Fastify with Helmet for security
- Serve static files from src/ui/manager/static/
- Use Handlebars for templates
- Support multipart/form-data for uploads
- Stream progress via Server-Sent Events
- CORS enabled for development
- Route handlers access domain services directly (server-side)
- Manager UI runs on localhost and can directly access backend services
- Maintain existing UI architecture: localhost-based web interface

## Data Models

### LanceDB Schema

#### Knowledge Base Table Schema
```typescript
{
  id: string,              // UUID
  content: string,         // Chunk text content
  embedding: Float32[384], // Vector embedding
  filePath: string,        // Original file path
  fileName: string,        // File name
  documentType: string,    // pdf, docx, etc.
  chunkType: string,       // paragraph, section, etc.
  chunkIndex: number,      // Position in document
  tokenCount: number,      // Number of tokens
  isTest: boolean,         // Is test file
  pageNumber: number?,     // Page number (if applicable)
  headingPath: string[]?,  // Heading hierarchy
  metadata: JSON,          // Additional metadata
  createdAt: timestamp,    // Ingestion timestamp
}
```

### Configuration Schema

```typescript
interface Configuration {
  lancedb: {
    persistPath: string;           // Default: ~/.knowledge-base/lancedb
  };
  embedding: {
    modelName: string;             // Default: Xenova/all-MiniLM-L6-v2
    cachePath: string;             // Default: ~/.knowledge-base/models
  };
  server: {
    port: number;                  // Default: 8008
    host: string;                  // Default: localhost
  };
  mcp: {
    transport: 'stdio' | 'http';   // Default: stdio
  };
  ingestion: {
    batchSize: number;             // Default: 100
    maxFileSize: number;           // Default: 10485760 (10MB)
  };
  search: {
    defaultMaxResults: number;     // Default: 50
    cacheTimeoutSeconds: number;   // Default: 60
  };
  document: {
    conversionTimeout: number;     // Default: 30000 (30s)
    maxTokens: number;             // Default: 512
    chunkSize: number;             // Default: 1000
    chunkOverlap: number;          // Default: 200
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';  // Default: info
  };
  schemaVersion: string;           // Default: 1.0.0
}
```

### File System Structure

```
~/.knowledge-base/
├── lancedb/                      # Vector database
│   ├── kb_my-docs_1_0_0/        # Knowledge base tables
│   │   ├── data/
│   │   └── index/
│   └── kb_work-docs_1_0_0/
├── models/                       # Embedding models cache
│   └── Xenova/
│       └── all-MiniLM-L6-v2/
│           ├── config.json
│           ├── tokenizer.json
│           └── model.onnx
├── temp/                         # Temporary files (auto-cleaned)
└── config.json                   # User configuration
```

## Error Handling

### Error Categories

1. **User Errors** (400-level):
   - Invalid file format
   - File too large
   - Knowledge base not found
   - Invalid configuration

2. **System Errors** (500-level):
   - Docling not installed
   - LanceDB connection failed
   - Embedding generation failed
   - Disk space exhausted

3. **Transient Errors** (retry-able):
   - Document conversion timeout
   - Network issues (if using API mode)
   - Temporary file system issues

### Error Handling Strategy

**Document Conversion Errors**:
```typescript
try {
  result = await documentConverter.convertDocument(filePath);
} catch (error) {
  if (error instanceof TimeoutError) {
    logger.warn(`Conversion timeout for ${filePath}, using fallback`);
    result = await fallbackTextExtraction(filePath);
  } else if (error instanceof UnsupportedFormatError) {
    logger.error(`Unsupported format: ${filePath}`);
    throw error;
  } else {
    logger.error(`Conversion failed: ${error.message}`);
    throw new DocumentConversionError(`Failed to convert ${filePath}`, error);
  }
}
```

**Ingestion Errors**:
```typescript
// Continue on individual file errors, collect error list
for (const file of files) {
  try {
    await processFile(file);
    stats.filesProcessed++;
  } catch (error) {
    logger.error(`Failed to process ${file.path}: ${error.message}`);
    stats.errors.push({
      filePath: file.path,
      error: error.message,
      timestamp: new Date()
    });
    stats.filesSkipped++;
  }
}
```

**Search Errors**:
```typescript
try {
  results = await searchService.search(query, options);
} catch (error) {
  if (error instanceof KnowledgeBaseNotFoundError) {
    return { error: 'Knowledge base not found', code: 'KB_NOT_FOUND' };
  } else {
    logger.error(`Search failed: ${error.message}`);
    return { error: 'Search failed', code: 'SEARCH_ERROR' };
  }
}
```

### Error Messages

All error messages should:
- Be clear and actionable
- Include context (file path, knowledge base name)
- Suggest next steps when possible
- Not expose sensitive information
- Be logged with appropriate level

Examples:
- ✅ "Failed to convert document.pdf: Docling is not installed. Please run: pip install docling"
- ✅ "Document conversion timed out after 30 seconds. Try increasing document.conversionTimeout in config."
- ❌ "Error: undefined"
- ❌ "Failed to process /Users/john/secret-docs/passwords.txt"

## Testing Strategy

### Testing Approach

We will use a dual testing approach combining unit tests and property-based tests:

**Unit Tests**:
- Specific examples and edge cases
- Integration points between components
- Error conditions and fallback behavior
- UI interactions and API endpoints

**Property-Based Tests**:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Validation of correctness properties from design

### Test Organization

```
src/
├── domains/
│   ├── document/
│   │   ├── __tests__/
│   │   │   ├── document-converter.test.ts
│   │   │   ├── document-chunker.test.ts
│   │   │   ├── document-converter.properties.test.ts
│   │   │   └── document-chunker.properties.test.ts
│   │   ├── document-converter.service.ts
│   │   └── document-chunker.service.ts
│   ├── knowledgebase/
│   │   ├── __tests__/
│   │   │   ├── knowledgebase.service.test.ts
│   │   │   └── knowledgebase.properties.test.ts
│   │   └── knowledgebase.service.ts
│   └── ...
```

### Property-Based Testing Configuration

- **Library**: fast-check
- **Minimum iterations**: 100 per property test
- **Tag format**: `// Feature: refactor-to-mcp-local-knowledge, Property {N}: {description}`
- **Generators**: Custom generators for DocumentType, ChunkType, file paths, etc.

### Test Coverage Requirements

- **Minimum coverage**: 80% overall
- **Critical paths**: 90%+ coverage
- **All public APIs**: Must have tests
- **Error paths**: Must be tested

### Key Test Scenarios

**Document Conversion**:
- ✅ Convert each supported format successfully
- ✅ Handle unsupported formats gracefully
- ✅ Timeout after 30 seconds
- ✅ Fallback to text extraction on failure
- ✅ Extract metadata correctly
- ✅ Clean up temporary files

**Document Chunking**:
- ✅ Use HybridChunker successfully
- ✅ Fallback to simple chunking on failure
- ✅ Preserve document structure
- ✅ Include heading context
- ✅ Calculate token counts correctly
- ✅ Assign appropriate chunk types

**Ingestion Pipeline**:
- ✅ Scan directory and find all document files
- ✅ Respect .gitignore patterns
- ✅ Process files in batches
- ✅ Continue on individual file errors
- ✅ Report comprehensive statistics
- ✅ Track progress for UI updates

**Search**:
- ✅ Generate query embeddings
- ✅ Perform vector similarity search
- ✅ Apply filters correctly
- ✅ Cache results appropriately
- ✅ Return formatted results with metadata

**File Upload**:
- ✅ Accept multipart/form-data
- ✅ Validate file types and sizes
- ✅ Save files temporarily
- ✅ Trigger ingestion
- ✅ Stream progress via SSE
- ✅ Clean up temporary files

**MCP Tools**:
- ✅ Validate input schemas
- ✅ Handle all tool invocations
- ✅ Return structured responses
- ✅ Handle errors gracefully


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

**Consolidated Properties:**
- Document format conversion properties (2.1-2.8) → Single property covering all formats
- Chunk metadata properties (4.5, 4.6) → Combined into chunk validity property
- Search filter properties (12.4, 12.5, 12.6) → Combined into search filtering property
- Upload validation properties (15.2, 22.3, 22.4) → Combined into upload validation property
- Logging properties (17.1, 17.2, 17.3) → Combined into logging correctness property

**Eliminated Redundancies:**
- Property about embedding generation (12.1) is subsumed by search property (12.2)
- Property about temp file cleanup (15.7) is covered by upload completion property (15.3)
- Property about session ID uniqueness (15.4) is covered by progress tracking property (15.6)

### Document Processing Properties

**Property 1: Document Format Conversion**

*For any* supported document file (PDF, DOCX, PPTX, XLSX, HTML, Markdown, text, audio), when converted by the Document_Converter, the result should contain markdown content and complete metadata (title, format, word count, hasImages, hasTables).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2**

**Property 2: Unsupported Format Error Handling**

*For any* file with an unsupported extension, when provided to the Document_Converter, the system should return a descriptive error message indicating the format is not supported.

**Validates: Requirements 2.9**

**Property 3: Conversion Fallback**

*For any* document where primary conversion fails, the Document_Converter should attempt fallback text extraction and return either extracted text or a clear error message.

**Validates: Requirements 3.4**

**Property 4: Conversion Logging**

*For any* document conversion (successful or failed), the system should log the operation with conversion duration included in the log entry.

**Validates: Requirements 3.5**

### Document Chunking Properties

**Property 5: Chunk Validity**

*For any* document that is chunked, every resulting chunk should have: non-empty content, a valid chunk_type (paragraph, section, table, heading, list, code), a non-negative token count, and a sequential chunk index.

**Validates: Requirements 4.5, 4.6**

**Property 6: Structure Preservation**

*For any* document with headings, when chunked by the Document_Chunker, chunks should preserve the heading hierarchy by including the headingPath in metadata.

**Validates: Requirements 4.2, 4.3**

**Property 7: Chunking Fallback**

*For any* document where HybridChunker fails, the Document_Chunker should fallback to simple chunking with chunk_size 1000 and chunk_overlap 200, and all chunks should have hasContext set to false.

**Validates: Requirements 4.4**

### File Scanning Properties

**Property 8: Document File Detection**

*For any* directory containing files with supported extensions (.pdf, .docx, .pptx, .xlsx, .html, .md, .txt, .mp3, .wav, .m4a, .flac), when scanned by the Ingestion_CLI, all such files should be detected and classified with the correct document_type.

**Validates: Requirements 10.1, 10.3**

**Property 9: Gitignore Respect**

*For any* directory with a .gitignore file, when scanned by the Ingestion_CLI, files matching .gitignore patterns should not appear in the scan results.

**Validates: Requirements 10.2**

**Property 10: Test File Detection**

*For any* file path containing "test" or "spec" in any path component, the file classification should mark isTest as true.

**Validates: Requirements 10.4**

**Property 11: File Size Filtering**

*For any* file exceeding max_file_size, when scanned by the Ingestion_CLI, the file should be excluded from results and a warning should be logged.

**Validates: Requirements 10.5**

### Ingestion Pipeline Properties

**Property 12: Ingestion Round Trip**

*For any* valid document file, when ingested into a knowledge base, searching for unique content from that document should return at least one result containing that content.

**Validates: Requirements 11.2, 11.3, 11.4, 11.5**

**Property 13: Batch Processing**

*For any* set of files to ingest, the Ingestion_CLI should process them in batches where each batch contains at most batchSize files (default 100).

**Validates: Requirements 11.6**

**Property 14: Ingestion Reporting**

*For any* completed ingestion, the result should include filesProcessed count, filesSkipped count, chunksCreated count, errors array, and duration in milliseconds.

**Validates: Requirements 11.7**

**Property 15: Error Resilience**

*For any* file that fails during ingestion, the Ingestion_CLI should log the error, add it to the errors array, increment filesSkipped, and continue processing remaining files.

**Validates: Requirements 11.8**

### Search Properties

**Property 16: Search Result Completeness**

*For any* search query that returns results, every result should contain: non-empty content, a similarity score between 0 and 1, and complete metadata (filePath, documentType, chunkType, chunkIndex, isTest).

**Validates: Requirements 12.3**

**Property 17: Search Filtering**

*For any* search with filters (documentType, excludeTests, maxResults), the results should respect all filters: only matching documentType (if specified), no test files (if excludeTests=true), and count not exceeding maxResults.

**Validates: Requirements 12.4, 12.5, 12.6**

**Property 18: Search Caching**

*For any* identical search query executed twice within 60 seconds, the second execution should return cached results and complete faster than the first execution.

**Validates: Requirements 12.7**

### Upload API Properties

**Property 19: Upload Validation**

*For any* file uploaded to /api/upload/file, the system should validate: file type is in supported formats, file size does not exceed maxFileSize, and file path does not contain directory traversal sequences (../).

**Validates: Requirements 15.2, 22.3, 22.4, 22.5**

**Property 20: Upload Processing**

*For any* valid uploaded file, the system should: save it temporarily, create a unique upload session ID, trigger ingestion, stream progress updates via SSE, and delete temporary files upon completion.

**Validates: Requirements 15.3, 15.4, 15.6, 15.7**

**Property 21: Upload Error Handling**

*For any* upload that fails validation or processing, the API should return an HTTP error response with status code 400 (client error) or 500 (server error) and include error details in the response body.

**Validates: Requirements 15.8**

### Configuration Properties

**Property 22: Configuration Merging**

*For any* configuration file that exists, when loaded by the system, the resulting configuration should contain all default values merged with file values, where file values override defaults.

**Validates: Requirements 16.10**

### Logging Properties

**Property 23: Logging Correctness**

*For any* system event, the log entry should have the appropriate level (error for errors with stack trace, warn for warnings, info for significant operations) and should not contain sensitive information (passwords, API keys, full file paths with user directories).

**Validates: Requirements 17.1, 17.2, 17.3, 17.8**

### Performance Properties

**Property 24: Search Performance**

*For any* knowledge base with fewer than 10,000 chunks, when a search query is executed, the search should complete and return results in under 500ms.

**Validates: Requirements 21.1**

**Property 25: Conversion Performance**

*For any* document under 10MB, when converted by the Document_Converter, the conversion should complete in under 30 seconds or timeout with an appropriate error.

**Validates: Requirements 21.2**

**Property 26: Ingestion Throughput**

*For any* batch of documents being ingested, the system should process at least 10 documents per minute on average.

**Validates: Requirements 21.3**

### Security Properties

**Property 27: Local Processing**

*For any* document processing operation (conversion, chunking, embedding, search), the system should not make external network calls to cloud services.

**Validates: Requirements 22.1**

**Property 28: Local Storage**

*For any* data written by the system (vector database, models, configuration), the file path should be under the user's home directory (~/.knowledge-base/).

**Validates: Requirements 22.2**

### Summary

We have identified **28 correctness properties** that cover the testable acceptance criteria from the requirements document. These properties focus on:

- **Document processing** (8 properties): Conversion, chunking, error handling
- **File operations** (4 properties): Scanning, classification, filtering
- **Ingestion pipeline** (4 properties): Round-trip, batching, reporting, resilience
- **Search functionality** (3 properties): Completeness, filtering, caching
- **Upload API** (3 properties): Validation, processing, error handling
- **System behavior** (6 properties): Configuration, logging, performance, security

Each property is universally quantified ("for any") and references the specific requirements it validates. These properties will be implemented as property-based tests using fast-check with a minimum of 100 iterations per test.

