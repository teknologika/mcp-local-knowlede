# Product Overview

**Package Name**: `@teknologika/mcp-codebase-search`  
**Version**: 0.1.0  
**Status**: Production Ready

An MCP (Model Context Protocol) server that provides local-first semantic search capabilities for codebases.

## Purpose

This package implements an MCP server that enables AI assistants to search and analyze codebases efficiently. It provides tools for semantic search, code navigation, and repository exploration through the Model Context Protocol, with all processing happening locally without cloud dependencies.

## Key Features

### Core Capabilities
- **Local-First Architecture**: All operations run locally without external API calls
- **Semantic Search**: Find code by meaning using vector embeddings, not just keywords
- **Tree-sitter Parsing**: AST-aware code chunking for meaningful, context-rich results
- **MCP Integration**: Seamless integration with MCP-compatible AI assistants (Claude Desktop, etc.)

### Multi-Language Support
- C# (`.cs`)
- Java (`.java`)
- JavaScript (`.js`, `.jsx`)
- TypeScript (`.ts`, `.tsx`)
- Python (`.py`)

### Smart Filtering
- **Test File Detection**: Automatically identifies and tags test files
- **Library File Detection**: Identifies vendor/library code
- **Gitignore Support**: Respects .gitignore patterns during ingestion
- **Search Filters**: Exclude tests and libraries from search results

### User Interfaces
- **MCP Server**: stdio-based server for AI assistant integration
- **CLI Tool**: Command-line interface for codebase ingestion
- **Web UI**: Browser-based management interface with:
  - Real-time ingestion progress tracking
  - Interactive search with filters
  - Codebase management (add, rename, remove)
  - Statistics and metadata visualization

### Performance
- Sub-500ms search responses with intelligent caching
- Batch processing for efficient ingestion
- Optimized vector similarity search
- Memory-efficient streaming for large codebases

### Developer Experience
- Simple installation via npm
- Zero configuration required (sensible defaults)
- Comprehensive documentation
- TypeScript throughout with strict typing

## Technology Stack

- **Vector Database**: LanceDB (local, file-based)
- **Embeddings**: Hugging Face Transformers (local model)
- **Code Parsing**: Tree-sitter (AST-aware)
- **Web Framework**: Fastify (Manager UI)
- **Language**: TypeScript (Node.js 23+)
- **Protocol**: Model Context Protocol (MCP)
