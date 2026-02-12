# Requirements Document: Refactor to mcp-local-knowledge

## Introduction

This document specifies the requirements for refactoring the existing `@teknologika/mcp-codebase-search` package into `@teknologika/mcp-local-knowledge`. The refactoring transforms a code-focused semantic search tool into a general-purpose document knowledge base system that supports multiple document formats through Docling integration.

The system will maintain its local-first architecture, MCP protocol integration, and semantic search capabilities while replacing code-specific features (tree-sitter parsing, language detection) with document processing capabilities (PDF, DOCX, PPTX, XLSX, HTML, Markdown, text, and audio files).

## Glossary

- **Knowledge_Base**: A collection of indexed documents with associated metadata and vector embeddings
- **MCP_Server**: Model Context Protocol server that provides tools for AI assistants
- **Document_Converter**: Service that converts various document formats to markdown using docling-sdk
- **Document_Chunker**: Service that splits documents into semantic chunks using HybridChunker
- **Embedding_Service**: Service that generates vector embeddings for text chunks
- **Vector_Database**: LanceDB instance storing document chunks and embeddings
- **Manager_UI**: Web-based interface for managing knowledge bases
- **Ingestion_CLI**: Command-line tool for ingesting documents into knowledge bases
- **docling-sdk**: TypeScript npm package that wraps Python Docling for document conversion
- **HybridChunker**: Docling's structure-aware, token-aware document chunking algorithm
- **MCP_Tool**: A callable function exposed through the MCP protocol
- **Document_Type**: Classification of document format (pdf, docx, pptx, xlsx, html, markdown, text, audio)
- **Chunk_Type**: Classification of document chunk (paragraph, section, table, heading)
- **Search_Result**: A document chunk returned from semantic search with metadata
- **Upload_Session**: A temporary session for tracking file upload progress

## Requirements

### Requirement 1: Package Identity and Naming

**User Story:** As a user, I want the package to reflect its document-focused purpose, so that I understand what it does and can find it easily.

#### Acceptance Criteria

1. THE Package_Manager SHALL publish the package with name "@teknologika/mcp-local-knowledge"
2. THE Package_Manager SHALL set the package description to "Local-first semantic search for documents using MCP protocol"
3. THE Package_Manager SHALL include keywords: "mcp", "model-context-protocol", "semantic-search", "documents", "knowledge-base", "embeddings", "vector-search", "docling", "local-first", "lancedb"
4. THE Package_Manager SHALL provide executable command "mcp-local-knowledge" for the MCP server
5. THE Package_Manager SHALL provide executable command "mcp-knowledge-ingest" for the ingestion CLI
6. THE Package_Manager SHALL provide executable command "mcp-knowledge-manager" for the Manager UI

### Requirement 2: Document Format Support

**User Story:** As a user, I want to ingest various document formats, so that I can build a comprehensive knowledge base from my existing documents.

#### Acceptance Criteria

1. WHEN a PDF file is provided, THE Document_Converter SHALL convert it to markdown with OCR support
2. WHEN a DOCX file is provided, THE Document_Converter SHALL convert it to markdown preserving formatting
3. WHEN a PPTX file is provided, THE Document_Converter SHALL convert it to markdown extracting slide content
4. WHEN an XLSX file is provided, THE Document_Converter SHALL convert it to markdown extracting table data
5. WHEN an HTML file is provided, THE Document_Converter SHALL convert it to markdown preserving structure
6. WHEN a Markdown file is provided, THE Document_Converter SHALL process it natively
7. WHEN a text file is provided, THE Document_Converter SHALL process it as plain text
8. WHEN an audio file (MP3, WAV, M4A, FLAC) is provided, THE Document_Converter SHALL transcribe it using Whisper ASR
9. WHEN an unsupported file format is provided, THE Document_Converter SHALL return a descriptive error

### Requirement 3: Document Conversion

**User Story:** As a user, I want documents converted to a consistent format, so that they can be processed uniformly for search.

#### Acceptance Criteria

1. WHEN a document is converted, THE Document_Converter SHALL return markdown content
2. WHEN a document is converted, THE Document_Converter SHALL extract metadata including title, format, page count, word count, presence of images, and presence of tables
3. WHEN document conversion exceeds 30 seconds, THE Document_Converter SHALL timeout and return an error
4. WHEN document conversion fails, THE Document_Converter SHALL attempt fallback text extraction
5. WHEN document conversion completes, THE Document_Converter SHALL log the conversion duration

### Requirement 4: Document Chunking

**User Story:** As a user, I want documents split into meaningful chunks, so that search results are relevant and contextual.

#### Acceptance Criteria

1. WHEN a document is chunked, THE Document_Chunker SHALL use HybridChunker with max_tokens of 512
2. WHEN a document is chunked, THE Document_Chunker SHALL preserve document structure (headings, sections, tables)
3. WHEN a document is chunked, THE Document_Chunker SHALL include heading hierarchy as context
4. WHEN HybridChunker fails, THE Document_Chunker SHALL fallback to simple chunking with chunk_size 1000 and chunk_overlap 200
5. WHEN a chunk is created, THE Document_Chunker SHALL assign a chunk_type (paragraph, section, table, heading)
6. WHEN a chunk is created, THE Document_Chunker SHALL calculate token count

### Requirement 5: docling-sdk Integration

**User Story:** As a developer, I want to use docling-sdk for document processing, so that I have a TypeScript-native solution without maintaining Python code.

#### Acceptance Criteria

1. THE Package_Manager SHALL include "docling-sdk" as a dependency
2. WHEN the system initializes, THE Document_Converter SHALL create a Docling client in CLI mode
3. WHEN docling-sdk is not available, THE System SHALL log an error with installation instructions
4. WHEN Python Docling is not installed, THE System SHALL display message "Please install Docling: pip install docling"
5. THE Document_Converter SHALL configure docling-sdk with output_dir for temporary files

### Requirement 6: Code-Specific Feature Removal

**User Story:** As a developer, I want code-specific features removed, so that the codebase is focused and maintainable.

#### Acceptance Criteria

1. THE Package_Manager SHALL remove dependency "tree-sitter"
2. THE Package_Manager SHALL remove dependency "tree-sitter-c-sharp"
3. THE Package_Manager SHALL remove dependency "tree-sitter-java"
4. THE Package_Manager SHALL remove dependency "tree-sitter-javascript"
5. THE Package_Manager SHALL remove dependency "tree-sitter-python"
6. THE Package_Manager SHALL remove dependency "tree-sitter-typescript"
7. THE System SHALL delete directory "src/domains/parsing/"
8. THE System SHALL remove all language detection utilities
9. THE System SHALL remove all code file classification logic

### Requirement 7: Domain Renaming

**User Story:** As a developer, I want consistent naming throughout the codebase, so that the code is clear and maintainable.

#### Acceptance Criteria

1. THE System SHALL rename directory "src/domains/codebase/" to "src/domains/knowledgebase/"
2. THE System SHALL rename type "Codebase" to "KnowledgeBase"
3. THE System SHALL rename type "CodebaseMetadata" to "KnowledgeBaseMetadata"
4. THE System SHALL rename type "CodebaseStats" to "KnowledgeBaseStats"
5. THE System SHALL rename file "codebase.service.ts" to "knowledgebase.service.ts"
6. THE System SHALL update all import statements to reflect new names
7. THE System SHALL update all variable names containing "codebase" to "knowledgebase"

### Requirement 8: MCP Tool Renaming

**User Story:** As an AI assistant user, I want MCP tools with clear names, so that I understand what each tool does.

#### Acceptance Criteria

1. THE MCP_Server SHALL rename tool "list_codebases" to "list_knowledgebases"
2. THE MCP_Server SHALL rename tool "search_codebases" to "search_knowledgebases"
3. THE MCP_Server SHALL rename tool "get_codebase_stats" to "get_knowledgebase_stats"
4. THE MCP_Server SHALL rename tool "open_codebase_manager" to "open_knowledgebase_manager"
5. WHEN a tool schema is defined, THE MCP_Server SHALL replace parameter "codebaseName" with "knowledgebaseName"
6. WHEN a tool schema is defined, THE MCP_Server SHALL replace filter "language" with "documentType"
7. WHEN a tool schema is defined, THE MCP_Server SHALL update descriptions to reflect document focus

### Requirement 9: Data Directory Migration

**User Story:** As a user, I want my data stored in an appropriately named directory, so that I can easily locate and manage it.

#### Acceptance Criteria

1. THE System SHALL use default data directory "~/.knowledge-base/"
2. THE System SHALL create subdirectory "~/.knowledge-base/lancedb/" for vector database
3. THE System SHALL create subdirectory "~/.knowledge-base/models/" for embedding models
4. THE Vector_Database SHALL name tables with prefix "kb_" instead of "codebase_"
5. THE System SHALL update configuration default paths to use "~/.knowledge-base/"

### Requirement 10: File Scanning and Classification

**User Story:** As a user, I want the system to automatically detect and classify document files, so that ingestion is seamless.

#### Acceptance Criteria

1. WHEN scanning a directory, THE Ingestion_CLI SHALL detect files with extensions: .pdf, .docx, .doc, .pptx, .ppt, .xlsx, .xls, .html, .htm, .md, .markdown, .txt, .mp3, .wav, .m4a, .flac
2. WHEN scanning a directory, THE Ingestion_CLI SHALL respect .gitignore patterns
3. WHEN a file is detected, THE Ingestion_CLI SHALL classify its document_type based on extension
4. WHEN a file is detected, THE Ingestion_CLI SHALL check if it is a test file (contains "test" or "spec" in path)
5. WHEN a file exceeds max_file_size, THE Ingestion_CLI SHALL skip it and log a warning

### Requirement 11: Ingestion Pipeline

**User Story:** As a user, I want to ingest documents into a knowledge base, so that I can search them semantically.

#### Acceptance Criteria

1. WHEN ingestion starts, THE Ingestion_CLI SHALL scan the specified directory for document files
2. WHEN a document is found, THE Ingestion_CLI SHALL convert it using Document_Converter
3. WHEN a document is converted, THE Ingestion_CLI SHALL chunk it using Document_Chunker
4. WHEN chunks are created, THE Ingestion_CLI SHALL generate embeddings using Embedding_Service
5. WHEN embeddings are generated, THE Ingestion_CLI SHALL store chunks and embeddings in Vector_Database
6. WHEN ingestion processes files, THE Ingestion_CLI SHALL process them in batches of 100
7. WHEN ingestion completes, THE Ingestion_CLI SHALL report total files processed, chunks created, and duration
8. WHEN ingestion encounters an error, THE Ingestion_CLI SHALL log the error and continue with next file

### Requirement 12: Semantic Search

**User Story:** As a user, I want to search my knowledge base semantically, so that I can find relevant information by meaning.

#### Acceptance Criteria

1. WHEN a search query is provided, THE Search_Service SHALL generate an embedding for the query
2. WHEN a query embedding is generated, THE Search_Service SHALL perform vector similarity search in Vector_Database
3. WHEN search results are returned, THE Search_Service SHALL include chunk content, metadata, and similarity score
4. WHEN a documentType filter is provided, THE Search_Service SHALL return only chunks matching that document type
5. WHEN an excludeTests filter is true, THE Search_Service SHALL exclude chunks from test files
6. WHEN maxResults parameter is provided, THE Search_Service SHALL limit results to that number
7. WHEN search completes in under 500ms, THE Search_Service SHALL cache results for 60 seconds

### Requirement 13: Manager UI File Upload

**User Story:** As a user, I want to upload files through the Manager UI, so that I can ingest documents without using the command line.

#### Acceptance Criteria

1. WHEN the Manager UI loads, THE Manager_UI SHALL display a drag-and-drop zone for file upload
2. WHEN a user drags files over the drop zone, THE Manager_UI SHALL provide visual feedback
3. WHEN a user drops files, THE Manager_UI SHALL validate file types and display file list
4. WHEN a user clicks upload, THE Manager_UI SHALL send files to the upload endpoint
5. WHEN files are uploading, THE Manager_UI SHALL display progress indicators for each file
6. WHEN upload completes, THE Manager_UI SHALL display success message and update knowledge base list
7. WHEN upload fails, THE Manager_UI SHALL display error message with details

### Requirement 14: Manager UI Folder Selection

**User Story:** As a user, I want to select and upload entire folders through the Manager UI, so that I can ingest document collections efficiently.

#### Acceptance Criteria

1. WHEN the Manager UI loads, THE Manager_UI SHALL display a folder selection button
2. WHEN a user clicks folder selection, THE Manager_UI SHALL open a folder picker dialog
3. WHEN a user selects a folder, THE Manager_UI SHALL scan for document files recursively
4. WHEN files are found, THE Manager_UI SHALL display file count and total size
5. WHEN a user confirms upload, THE Manager_UI SHALL upload all files with progress tracking
6. WHEN folder upload completes, THE Manager_UI SHALL display summary of files processed

### Requirement 15: Upload API Endpoints

**User Story:** As a developer, I want RESTful API endpoints for file upload, so that the Manager UI can upload files.

#### Acceptance Criteria

1. THE Manager_UI SHALL provide endpoint POST "/api/upload/file" accepting multipart/form-data
2. WHEN a file is uploaded to "/api/upload/file", THE Manager_UI SHALL validate file type and size
3. WHEN a file is valid, THE Manager_UI SHALL save it temporarily and trigger ingestion
4. WHEN ingestion starts, THE Manager_UI SHALL create an upload_session with unique ID
5. THE Manager_UI SHALL provide endpoint GET "/api/upload/progress/:uploadId" returning Server-Sent Events
6. WHEN progress is requested, THE Manager_UI SHALL stream ingestion progress updates
7. WHEN upload completes, THE Manager_UI SHALL delete temporary files
8. WHEN upload fails, THE Manager_UI SHALL return error response with status code 400 or 500

### Requirement 16: Configuration Management

**User Story:** As a user, I want sensible default configuration, so that the system works without manual setup.

#### Acceptance Criteria

1. THE System SHALL use default lancedb.persistPath of "~/.knowledge-base/lancedb"
2. THE System SHALL use default embedding.cachePath of "~/.knowledge-base/models"
3. THE System SHALL use default embedding.modelName of "Xenova/all-MiniLM-L6-v2"
4. THE System SHALL use default server.port of 8008
5. THE System SHALL use default ingestion.batchSize of 100
6. THE System SHALL use default ingestion.maxFileSize of 10485760 (10MB)
7. THE System SHALL use default search.defaultMaxResults of 50
8. THE System SHALL use default document.conversionTimeout of 30000 (30 seconds)
9. THE System SHALL use default document.maxTokens of 512
10. WHEN a configuration file exists, THE System SHALL load and merge it with defaults

### Requirement 17: Error Handling and Logging

**User Story:** As a user, I want clear error messages and logs, so that I can troubleshoot issues.

#### Acceptance Criteria

1. WHEN an error occurs, THE System SHALL log the error with level "error" including stack trace
2. WHEN a warning condition occurs, THE System SHALL log with level "warn"
3. WHEN a significant operation completes, THE System SHALL log with level "info"
4. WHEN docling-sdk is not available, THE System SHALL log error "docling-sdk is not installed or not in PATH"
5. WHEN Python Docling is not installed, THE System SHALL log error "Python Docling is not installed. Please run: pip install docling"
6. WHEN document conversion fails, THE System SHALL log error with file path and error message
7. WHEN document conversion times out, THE System SHALL log warning "Document conversion timed out after 30 seconds"
8. THE System SHALL redact sensitive information from logs (file paths containing user directories)

### Requirement 18: Backward Compatibility and Migration

**User Story:** As an existing user, I want guidance on migrating from the old package, so that I can upgrade smoothly.

#### Acceptance Criteria

1. THE Documentation SHALL provide a migration guide explaining breaking changes
2. THE Documentation SHALL provide steps to backup existing data
3. THE Documentation SHALL provide steps to uninstall old package
4. THE Documentation SHALL provide steps to install new package
5. THE Documentation SHALL provide steps to migrate data from "~/.codebase-memory/" to "~/.knowledge-base/"
6. THE Documentation SHALL provide updated MCP client configuration examples
7. THE Documentation SHALL document all renamed commands and tools

### Requirement 19: Documentation Updates

**User Story:** As a user, I want comprehensive documentation, so that I can use the system effectively.

#### Acceptance Criteria

1. THE Documentation SHALL update README.md title to "MCP Local Knowledge"
2. THE Documentation SHALL update README.md description to reflect document focus
3. THE Documentation SHALL remove "Supported Languages" section from README.md
4. THE Documentation SHALL add "Supported Document Formats" section to README.md
5. THE Documentation SHALL update installation instructions to include "pip install docling"
6. THE Documentation SHALL update all command examples to use new command names
7. THE Documentation SHALL update MCP client configuration examples
8. THE Documentation SHALL document docling-sdk dependency and setup
9. THE Documentation SHALL provide troubleshooting section for common issues

### Requirement 20: Testing Requirements

**User Story:** As a developer, I want comprehensive tests, so that I can ensure the system works correctly.

#### Acceptance Criteria

1. THE System SHALL maintain minimum 80% code coverage
2. THE System SHALL include unit tests for Document_Converter
3. THE System SHALL include unit tests for Document_Chunker
4. THE System SHALL include unit tests for renamed services
5. THE System SHALL include integration tests for document ingestion pipeline
6. THE System SHALL include integration tests for file upload endpoints
7. THE System SHALL include tests for each supported document format
8. THE System SHALL include tests for error handling scenarios
9. THE System SHALL include tests for MCP tool schemas and handlers

### Requirement 21: Performance Requirements

**User Story:** As a user, I want fast document processing and search, so that I can work efficiently.

#### Acceptance Criteria

1. WHEN a search query is executed, THE Search_Service SHALL return results in under 500ms for knowledge bases with fewer than 10,000 chunks
2. WHEN a document is converted, THE Document_Converter SHALL complete in under 30 seconds for documents under 10MB
3. WHEN documents are ingested, THE Ingestion_CLI SHALL process at least 10 documents per minute
4. WHEN the Manager UI loads, THE Manager_UI SHALL render in under 2 seconds
5. WHEN file upload progress is tracked, THE Manager_UI SHALL update progress at least once per second

### Requirement 22: Security Requirements

**User Story:** As a user, I want my data to remain secure and private, so that I can trust the system with sensitive documents.

#### Acceptance Criteria

1. THE System SHALL process all documents locally without external API calls
2. THE System SHALL store all data in local file system under user's home directory
3. WHEN files are uploaded, THE Manager_UI SHALL validate file types to prevent malicious uploads
4. WHEN files are uploaded, THE Manager_UI SHALL limit file size to prevent denial of service
5. THE System SHALL sanitize file paths to prevent directory traversal attacks
6. THE System SHALL use secure defaults for all configuration options
7. THE System SHALL not log sensitive information (API keys, passwords, personal data)

### Requirement 23: Dependency Management

**User Story:** As a developer, I want clear dependency requirements, so that I can set up the development environment.

#### Acceptance Criteria

1. THE Package_Manager SHALL require Node.js version 23.0.0 or higher
2. THE Package_Manager SHALL require npm version 10.0.0 or higher
3. THE Package_Manager SHALL include "docling-sdk" as a production dependency
4. THE Package_Manager SHALL include "@huggingface/transformers" as a production dependency
5. THE Package_Manager SHALL include "@lancedb/lancedb" as a production dependency
6. THE Package_Manager SHALL include "fastify" as a production dependency
7. THE Package_Manager SHALL include "vitest" as a development dependency
8. THE Documentation SHALL document Python 3.10+ requirement
9. THE Documentation SHALL document "pip install docling" as setup step

### Requirement 24: Build and Deployment

**User Story:** As a developer, I want a streamlined build process, so that I can deploy the package easily.

#### Acceptance Criteria

1. WHEN "npm run build" is executed, THE System SHALL compile TypeScript to JavaScript in dist/ directory
2. WHEN "npm run test" is executed, THE System SHALL run all tests and report coverage
3. WHEN "npm run lint" is executed, THE System SHALL check code quality with zero warnings
4. WHEN "npm publish" is executed, THE Package_Manager SHALL publish to npmjs.com with correct package name
5. WHEN the package is installed globally, THE System SHALL make commands available in PATH
6. THE Package_Manager SHALL include postinstall script to check for docling-sdk availability
7. THE Package_Manager SHALL set package version to 1.0.0 for initial release

