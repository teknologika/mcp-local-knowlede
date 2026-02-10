# @teknologika/mcp-codebase-search

> A local-first semantic search system for codebases using the Model Context Protocol (MCP)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D23.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Ingestion CLI](#ingestion-cli)
  - [MCP Server](#mcp-server)
  - [Manager UI](#manager-ui)
- [Configuration](#configuration)
- [MCP Client Configuration](#mcp-client-configuration)
- [Supported Languages](#supported-languages)
- [Search Query Examples](#search-query-examples)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

- [Schema Versioning](#schema-versioning)
- [Performance](#performance)
- [Security](#security)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Codebase Memory MCP Server enables LLM coding assistants to reliably discover existing code in a codebase, preventing duplicate implementations and wrong-file edits. It uses local embeddings, Tree-sitter-aware chunking, and ChromaDB for vector storage, ensuring all operations run locally without cloud dependencies.

### Why Use This?

- **Prevent Duplicate Code**: AI assistants can find existing implementations before creating new ones
- **Accurate Code Navigation**: Semantic search understands code meaning, not just keywords
- **Privacy-First**: All processing happens locally—your code never leaves your machine
- **Fast & Efficient**: Optimized for quick search responses with intelligent caching
- **Multi-Language**: Support for C#, Java, JavaScript, TypeScript, and Python

## Features

- 🔒 **Local-First**: All operations run locally without external API calls
- 🔍 **Semantic Search**: Find code by meaning, not just keywords
- 🌳 **Tree-sitter Parsing**: AST-aware code chunking for meaningful results
- 🤖 **MCP Integration**: Seamless integration with MCP-compatible AI assistants (Claude Desktop, etc.)
- 🌐 **Multi-Language Support**: C#, Java (JDK22+), JavaScript, TypeScript, Python
- 🖥️ **Web Management UI**: Manage indexed codebases through a web interface
- ⚡ **Performance Optimized**: Sub-500ms search responses with intelligent caching
- 📊 **Detailed Statistics**: Track chunk counts, file counts, and language distribution

## Installation

### Global Installation (Recommended)

```bash
npm install -g @teknologika/mcp-codebase-search
```

This makes the `mcp-server`, `ingest`, and `manager` commands available globally.

### Local Installation

```bash
npm install @teknologika/mcp-codebase-search
```

Then use with `npx`:
```bash
npx ingest --path ./my-project --name my-project
npx mcp-server
npx manager
```

### Requirements

- **Node.js**: 23.0.0 or higher
- **npm**: 10.0.0 or higher
- **Disk Space**: ~500MB for embedding models (downloaded on first use)

## Quick Start

### 1. Index Your First Codebase

```bash
ingest --path ./my-project --name my-project
```

**Example Output:**
```
Ingesting codebase: my-project
Path: /Users/dev/projects/my-project

Scanning files: [████████████████████] 100% (1,234/1,234)
Parsing code: [████████████████████] 100% (1,100/1,100)
Generating embeddings: [████████████████████] 100% (5,678/5,678)

✓ Ingestion completed successfully!

Statistics:
  Total files scanned: 1,234
  Supported files: 1,100
  Unsupported files: 134
  Chunks created: 5,678
  Duration: 45.2s

Languages detected:
  typescript: 3,200 chunks (800 files)
  python: 1,500 chunks (200 files)
  java: 978 chunks (100 files)
```

### 2. Configure Your MCP Client

#### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "codebase-search": {
      "command": "mcp-server",
      "args": []
    }
  }
}
```

#### For Other MCP Clients

```json
{
  "mcpServers": {
    "codebase-search": {
      "command": "mcp-server",
      "args": [],
      "env": {
        "CONFIG_PATH": "~/.codebase-memory/config.json"
      }
    }
  }
}
```

### 3. Start Using in Your AI Assistant

Once configured, your AI assistant can use these tools:

- **list_codebases**: See all indexed codebases
- **search_codebases**: Search for code semantically
- **get_codebase_stats**: View detailed statistics
- **open_codebase_manager**: Open the web UI

### 4. (Optional) Explore the Manager UI

```bash
manager
```

Opens `http://localhost:8008` in your default browser with a visual interface for managing codebases.

## Usage

### Ingestion CLI

The `ingest` command indexes a codebase for semantic search.

#### Basic Usage

```bash
ingest --path <directory> --name <codebase-name>
```

#### Options

| Option | Description | Required | Example |
|--------|-------------|----------|---------|
| `-p, --path` | Path to codebase directory | Yes | `--path ./my-project` |
| `-n, --name` | Unique name for the codebase | Yes | `--name my-project` |
| `-c, --config` | Path to configuration file | No | `--config ./config.json` |

#### Examples

**Index a local project:**
```bash
ingest --path ~/projects/my-app --name my-app
```

**Index with custom config:**
```bash
ingest --path ./backend --name backend-api --config ./custom-config.json
```

**Re-index an existing codebase:**
```bash
# Simply run the same command again - old data is automatically replaced
ingest --path ~/projects/my-app --name my-app
```

#### What Gets Indexed?

- ✅ All files with supported extensions (`.cs`, `.java`, `.js`, `.jsx`, `.ts`, `.tsx`, `.py`)
- ✅ Files in nested subdirectories (recursive scanning)
- ✅ Semantic code chunks (functions, classes, methods, interfaces)
- ❌ Files larger than 1MB (configurable via `maxFileSize`)
- ❌ Files in `.gitignore` (respects ignore patterns)
- ❌ Binary files and unsupported formats

### MCP Server

The MCP server exposes tools for AI assistants to search and explore codebases.

#### Starting the Server

```bash
mcp-server
```

The server runs in stdio mode and communicates with MCP clients via standard input/output.

#### Available Tools

##### 1. `list_codebases`

Lists all indexed codebases with metadata.

**Input:** None

**Output:**
```json
{
  "codebases": [
    {
      "name": "my-project",
      "path": "/path/to/project",
      "chunkCount": 5678,
      "fileCount": 1100,
      "lastIngestion": "2024-01-15T10:30:00Z",
      "languages": ["typescript", "python", "java"]
    }
  ]
}
```

##### 2. `search_codebases`

Performs semantic search across indexed codebases.

**Input:**
```json
{
  "query": "authentication function",
  "codebaseName": "my-project",  // Optional
  "language": "typescript",       // Optional
  "maxResults": 25                // Optional (default: 50)
}
```

**Output:**
```json
{
  "results": [
    {
      "filePath": "src/auth/authenticate.ts",
      "startLine": 15,
      "endLine": 45,
      "language": "typescript",
      "chunkType": "function",
      "content": "export async function authenticate(credentials: Credentials) { ... }",
      "similarityScore": 0.92,
      "codebaseName": "my-project"
    }
  ],
  "totalResults": 1,
  "queryTime": 45
}
```

##### 3. `get_codebase_stats`

Retrieves detailed statistics for a specific codebase.

**Input:**
```json
{
  "name": "my-project"
}
```

**Output:**
```json
{
  "name": "my-project",
  "path": "/path/to/project",
  "chunkCount": 5678,
  "fileCount": 1100,
  "lastIngestion": "2024-01-15T10:30:00Z",
  "languages": [
    { "language": "typescript", "fileCount": 800, "chunkCount": 3200 },
    { "language": "python", "fileCount": 200, "chunkCount": 1500 }
  ],
  "chunkTypes": [
    { "type": "function", "count": 2500 },
    { "type": "class", "count": 1200 },
    { "type": "method", "count": 1978 }
  ],
  "sizeBytes": 2500000
}
```

##### 4. `open_codebase_manager`

Opens the web-based manager UI in the default browser.

**Input:** None

**Output:**
```json
{
  "url": "http://localhost:8008",
  "message": "Manager UI opened in default browser"
}
```

### Manager UI

The Manager UI provides a web-based interface for managing indexed codebases.

#### Starting the Manager

```bash
manager
```

This will:
1. Start a Fastify server on port 8008 (configurable)
2. Automatically open `http://localhost:8008` in your default browser
3. Display all indexed codebases with statistics

#### Features

- **View Codebases**: See all indexed codebases with chunk counts, file counts, and languages
- **Detailed Statistics**: Click on a codebase to view detailed language distribution and chunk types
- **Rename Codebases**: Update codebase names while preserving all indexed data
- **Delete Codebases**: Remove codebases and all associated chunks
- **Manage Chunk Sets**: Delete specific ingestion runs while keeping others

#### HTTP API Endpoints

The Manager UI also exposes a REST API:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/codebases` | List all codebases |
| POST | `/api/search` | Search across codebases |
| GET | `/api/codebases/:name/stats` | Get codebase statistics |
| PUT | `/api/codebases/:name` | Rename a codebase |
| DELETE | `/api/codebases/:name` | Delete a codebase |
| DELETE | `/api/codebases/:name/chunk-sets/:timestamp` | Delete a chunk set |

## Configuration

The system can be configured using a JSON configuration file or environment variables. For detailed information about all configuration options, see **[CONFIG.md](CONFIG.md)**.

### Quick Start

#### Using Configuration File

1. **Copy the example configuration:**
   ```bash
   cp config.example.json ~/.codebase-memory/config.json
   ```

2. **Edit the configuration** to customize settings for your environment

3. **Restart services** for changes to take effect

#### Using Environment Variables

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** to set your values

3. **Source the file** or restart your shell

### Configuration File Example

See `config.example.json` for a complete example:

```json
{
  "chromadb": {
    "persistPath": "~/.codebase-memory/chromadb"
  },
  "embedding": {
    "modelName": "Xenova/all-MiniLM-L6-v2",
    "cachePath": "~/.codebase-memory/models"
  },
  "server": {
    "port": 8008,
    "host": "localhost"
  },
  "ingestion": {
    "batchSize": 100,
    "maxFileSize": 1048576
  },
  "search": {
    "defaultMaxResults": 50,
    "cacheTimeoutSeconds": 60
  },
  "logging": {
    "level": "info"
  }
}
```

**For detailed documentation of each option, see [CONFIG.md](CONFIG.md)**

### Configuration Options

#### ChromaDB Settings

| Option | Description | Default |
|--------|-------------|---------|
| `persistPath` | Directory for ChromaDB storage | `~/.codebase-memory/chromadb` |

#### Embedding Settings

| Option | Description | Default |
|--------|-------------|---------|
| `modelName` | Hugging Face model for embeddings | `Xenova/all-MiniLM-L6-v2` |
| `cachePath` | Directory for model cache | `~/.codebase-memory/models` |

#### Server Settings

| Option | Description | Default |
|--------|-------------|---------|
| `port` | Port for Manager UI server | `8008` |
| `host` | Host for Manager UI server | `localhost` |

#### Ingestion Settings

| Option | Description | Default |
|--------|-------------|---------|
| `batchSize` | Chunks per batch during ingestion | `100` |
| `maxFileSize` | Maximum file size in bytes | `1048576` (1MB) |

#### Search Settings

| Option | Description | Default |
|--------|-------------|---------|
| `defaultMaxResults` | Default maximum search results | `50` |
| `cacheTimeoutSeconds` | Search result cache timeout | `60` |

#### Logging Settings

| Option | Description | Default | Options |
|--------|-------------|---------|---------|
| `level` | Log level | `info` | `debug`, `info`, `warn`, `error` |

### Environment Variables

You can also configure via environment variables (see `.env.example`):

```bash
# ChromaDB
CHROMADB_PERSIST_PATH=~/.codebase-memory/chromadb

# Embedding
EMBEDDING_MODEL_NAME=Xenova/all-MiniLM-L6-v2
EMBEDDING_CACHE_PATH=~/.codebase-memory/models

# Server
SERVER_PORT=8008
SERVER_HOST=localhost

# Ingestion
INGESTION_BATCH_SIZE=100
INGESTION_MAX_FILE_SIZE=1048576

# Search
SEARCH_DEFAULT_MAX_RESULTS=50
SEARCH_CACHE_TIMEOUT_SECONDS=60

# Logging
LOG_LEVEL=info
```

## MCP Client Configuration

### Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codebase-search": {
      "command": "mcp-server",
      "args": []
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients, use the stdio transport:

```json
{
  "mcpServers": {
    "codebase-search": {
      "command": "mcp-server",
      "args": [],
      "env": {
        "CONFIG_PATH": "~/.codebase-memory/config.json",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Verifying Configuration

After configuring your MCP client:

1. Restart the client application
2. Check that the `codebase-search` server appears in the MCP server list
3. Try using the `list_codebases` tool to verify connectivity

## Supported Languages

The system uses Tree-sitter for AST-aware code parsing. Currently supported languages:

| Language | Extensions | Chunk Types |
|----------|-----------|-------------|
| **C#** | `.cs` | class, method, property, interface |
| **Java** | `.java` | class, method, field, interface |
| **JavaScript** | `.js`, `.jsx` | function, class, method |
| **TypeScript** | `.ts`, `.tsx` | function, class, method, interface |
| **Python** | `.py` | function, class, method |

### What Gets Extracted?

For each supported language, the system extracts:

- **Functions**: Top-level and nested functions
- **Classes**: Class declarations with their context
- **Methods**: Class methods and instance methods
- **Interfaces**: Interface definitions (TypeScript, C#, Java)
- **Properties**: Class properties (C#)
- **Fields**: Class fields (Java)

### Unsupported Files

Files with unsupported extensions are skipped during ingestion and logged:

```
Unsupported files by extension:
  .md: 50 files
  .json: 40 files
  .xml: 44 files
```

## Search Query Examples

### Basic Queries

**Find authentication code:**
```json
{
  "query": "user authentication"
}
```

**Find database queries:**
```json
{
  "query": "database query execution"
}
```

**Find error handling:**
```json
{
  "query": "error handling and logging"
}
```

### Filtered Queries

**Search in specific codebase:**
```json
{
  "query": "API endpoint handler",
  "codebaseName": "backend-api"
}
```

**Search specific language:**
```json
{
  "query": "data validation",
  "language": "typescript"
}
```

**Limit results:**
```json
{
  "query": "utility functions",
  "maxResults": 10
}
```

### Advanced Queries

**Combine filters:**
```json
{
  "query": "authentication middleware",
  "codebaseName": "web-app",
  "language": "typescript",
  "maxResults": 20
}
```

### Query Tips

- ✅ **Use natural language**: "user authentication function" works better than "auth"
- ✅ **Be specific**: "JWT token validation" is better than "validation"
- ✅ **Include context**: "database connection pooling" vs "connection"
- ❌ **Avoid single words**: "user" is too broad
- ❌ **Don't use code syntax**: Use "function that validates email" not "validateEmail()"

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Entry Points                             │
├──────────────┬──────────────────┬──────────────────────────┤
│  MCP Server  │  Ingestion CLI   │     Manager UI           │
│  (stdio)     │  (command-line)  │  (web interface)         │
└──────┬───────┴────────┬─────────┴──────────┬───────────────┘
       │                │                    │
       │                │                    │
┌──────▼────────────────▼────────────────────▼───────────────┐
│                   Core Services                             │
├─────────────┬──────────────┬──────────────┬────────────────┤
│  Codebase   │    Search    │  Ingestion   │   Embedding    │
│  Service    │   Service    │   Service    │    Service     │
└──────┬──────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │             │              │                │
       │             │              │                │
┌──────▼─────────────▼──────────────▼────────────────▼───────┐
│                   Storage & External                        │
├──────────────┬──────────────────┬─────────────────────────┤
│   ChromaDB   │  Tree-sitter     │  Hugging Face           │
│ (Vector DB)  │  (Code Parsing)  │  (Embeddings)           │
└──────────────┴──────────────────┴─────────────────────────┘
```

### Component Responsibilities

**MCP Server** (`mcp-server`)
- Exposes tools via Model Context Protocol
- Validates inputs and outputs
- Handles stdio communication

**Ingestion CLI** (`ingest`)
- Scans directories recursively
- Parses code with Tree-sitter
- Generates embeddings
- Stores chunks in ChromaDB

**Manager UI** (`manager`)
- Fastify web server
- REST API endpoints
- Single-page web interface
- Codebase management

**Core Services**
- **Codebase Service**: CRUD operations for codebases
- **Search Service**: Semantic search with filtering
- **Ingestion Service**: Orchestrates indexing pipeline
- **Embedding Service**: Generates vector embeddings

### Data Flow

#### Ingestion Flow

```
Source Code → File Scanner → Tree-sitter Parser → Chunks
                                                      ↓
ChromaDB ← Embeddings ← Embedding Service ← Chunks
```

#### Search Flow

```
Query → Embedding Service → Vector
                              ↓
                         ChromaDB Search
                              ↓
                         Ranked Results → Filter → Format → Response
```

### Storage Schema

**ChromaDB Collections:**
- Collection naming: `codebase_{name}_{schemaVersion}`
- Example: `codebase_my-project_v1_0_0`

**Document Structure:**
```json
{
  "id": "uuid",
  "embedding": [0.1, 0.2, ...],
  "metadata": {
    "codebaseName": "my-project",
    "filePath": "src/auth.ts",
    "startLine": 15,
    "endLine": 45,
    "language": "typescript",
    "chunkType": "function",
    "ingestionTimestamp": "2024-01-15T10:30:00Z",
    "schemaVersion": "1.0.0"
  },
  "document": "export async function authenticate(...) { ... }"
}
```

## Troubleshooting

### Common Issues

#### 1. "Command not found: mcp-server"

**Problem:** The package is not installed globally or not in PATH.

**Solution:**
```bash
# Reinstall globally
npm install -g @teknologika/mcp-codebase-search

# Or use npx
npx mcp-server
```

#### 2. "Failed to initialize ChromaDB"

**Problem:** ChromaDB persistence directory is not writable or corrupted.

**Solution:**
```bash
# Check permissions
ls -la ~/.codebase-memory/chromadb

# Reset ChromaDB (WARNING: deletes all data)
rm -rf ~/.codebase-memory/chromadb

# Re-ingest codebases
ingest --path ./my-project --name my-project
```

#### 3. "Embedding model download failed"

**Problem:** Network issues or insufficient disk space.

**Solution:**
```bash
# Check disk space
df -h ~/.codebase-memory

# Clear model cache and retry
rm -rf ~/.codebase-memory/models

# Run ingestion again (will re-download)
ingest --path ./my-project --name my-project
```

#### 4. "Search returns no results"

**Problem:** Codebase not indexed or query too specific.

**Solution:**
```bash
# Verify codebase is indexed
manager
# Check the UI for your codebase

# Try broader queries
# Instead of: "validateEmailAddress"
# Try: "email validation function"
```

#### 5. "Manager UI won't open"

**Problem:** Port 8008 is already in use.

**Solution:**
```bash
# Check what's using port 8008
lsof -i :8008

# Use a different port
# Edit ~/.codebase-memory/config.json
{
  "server": {
    "port": 8009
  }
}

# Or set environment variable
SERVER_PORT=8009 manager
```

#### 6. "MCP client can't connect to server"

**Problem:** Configuration issue or server not starting.

**Solution:**
```bash
# Test server manually
mcp-server

# Check logs
DEBUG=1 mcp-server

# Verify configuration path
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Schema Versioning

The system uses schema versioning to ensure compatibility between the application and stored data in ChromaDB. Each collection includes a schema version in its metadata.

### Current Schema Version

The current schema version is **1.0.0** (defined in `src/shared/config/config.js`).

### Version Checking

On startup, the MCP server and Manager UI automatically check the schema version of all existing collections. If a mismatch is detected, you'll see a warning message like:

```
⚠️  Schema Version Mismatch Detected

Found 2 collection(s) with incompatible schema versions:

  • Codebase: my-project
    Collection: codebase_my-project_v1_0_0
    Collection Version: 0.9.0
    Current Version: 1.0.0

Migration Instructions:
  1. Back up your data directory (see README for location)
  2. Re-ingest affected codebases using the "ingest" command
  3. Or see README.md for detailed migration steps
```

### Migration Path

When a schema version mismatch is detected, follow these steps:

#### Option 1: Re-ingestion (Recommended)

The simplest migration path is to re-ingest your codebases:

1. **Back up your data** (optional but recommended):
   ```bash
   cp -r ~/.codebase-memory ~/.codebase-memory.backup
   ```

2. **Delete the old codebase** using the Manager UI or by removing the ChromaDB collection

3. **Re-ingest the codebase**:
   ```bash
   ingest --path /path/to/codebase --name my-project
   ```

#### Option 2: Manual Migration

For advanced users who want to preserve specific data:

1. **Back up your data**:
   ```bash
   cp -r ~/.codebase-memory ~/.codebase-memory.backup
   ```

2. **Export data from old collections** (requires custom script using ChromaDB API)

3. **Transform data** to match new schema (schema changes documented in CHANGELOG)

4. **Import data** into new collections with updated schema version

#### Data Directory Location

By default, data is stored in:
- **ChromaDB**: `~/.codebase-memory/chromadb`
- **Embedding Models**: `~/.codebase-memory/models`

You can customize these locations in your configuration file.

### Schema Version History

- **1.0.0** (Current): Initial release schema
  - Collection naming: `codebase_{name}_{version}`
  - Metadata fields: `codebaseName`, `schemaVersion`, `createdAt`, `filePath`, `startLine`, `endLine`, `language`, `chunkType`, `ingestionTimestamp`

### Preventing Version Mismatches

To avoid version mismatches:

1. **Keep the package updated**: Run `npm update -g @teknologika/mcp-codebase-search` regularly
2. **Re-ingest after updates**: After updating the package, re-ingest your codebases
3. **Use consistent versions**: Ensure all instances (MCP server, Manager UI, Ingestion CLI) use the same package version

### Troubleshooting

**Q: Can I use collections with mismatched versions?**

A: The system will continue to operate, but results may be unpredictable. Re-ingestion is strongly recommended.

**Q: Will my data be lost during migration?**

A: Re-ingestion creates fresh data from your source code. As long as your source code is intact, no data is lost. The original ChromaDB collections can be backed up before deletion.

**Q: How do I check the schema version of a collection?**

A: The schema version is logged on startup. You can also query collection metadata directly using the ChromaDB API or check the Manager UI logs.

### Schema Versioning

The system uses schema versioning to ensure compatibility between the application and stored data in ChromaDB. Each collection includes a schema version in its metadata.

#### Current Schema Version

The current schema version is **1.0.0** (defined in `src/shared/config/config.js`).

#### Version Checking

On startup, the MCP server and Manager UI automatically check the schema version of all existing collections. If a mismatch is detected, you'll see a warning message like:

```
⚠️  Schema Version Mismatch Detected

Found 2 collection(s) with incompatible schema versions:

  • Codebase: my-project
    Collection: codebase_my-project_v1_0_0
    Collection Version: 0.9.0
    Current Version: 1.0.0

Migration Instructions:
  1. Back up your data directory (see README for location)
  2. Re-ingest affected codebases using the "ingest" command
  3. Or see README.md for detailed migration steps
```

#### Migration Path

When a schema version mismatch is detected, follow these steps:

**Option 1: Re-ingestion (Recommended)**

The simplest migration path is to re-ingest your codebases:

1. **Back up your data** (optional but recommended):
   ```bash
   cp -r ~/.codebase-memory ~/.codebase-memory.backup
   ```

2. **Delete the old codebase** using the Manager UI or by removing the ChromaDB collection

3. **Re-ingest the codebase**:
   ```bash
   ingest --path /path/to/codebase --name my-project
   ```

**Option 2: Manual Migration**

For advanced users who want to preserve specific data:

1. **Back up your data**:
   ```bash
   cp -r ~/.codebase-memory ~/.codebase-memory.backup
   ```

2. **Export data from old collections** (requires custom script using ChromaDB API)

3. **Transform data** to match new schema (schema changes documented in CHANGELOG)

4. **Import data** into new collections with updated schema version

#### Data Directory Location

By default, data is stored in:
- **ChromaDB**: `~/.codebase-memory/chromadb`
- **Embedding Models**: `~/.codebase-memory/models`

You can customize these locations in your configuration file.

#### Schema Version History

- **1.0.0** (Current): Initial release schema
  - Collection naming: `codebase_{name}_{version}`
  - Metadata fields: `codebaseName`, `schemaVersion`, `createdAt`, `filePath`, `startLine`, `endLine`, `language`, `chunkType`, `ingestionTimestamp`

#### Preventing Version Mismatches

To avoid version mismatches:

1. **Keep the package updated**: Run `npm update -g @teknologika/mcp-codebase-search` regularly
2. **Re-ingest after updates**: After updating the package, re-ingest your codebases
3. **Use consistent versions**: Ensure all instances (MCP server, Manager UI, Ingestion CLI) use the same package version

#### Troubleshooting

**Q: Can I use collections with mismatched versions?**

A: The system will continue to operate, but results may be unpredictable. Re-ingestion is strongly recommended.

**Q: Will my data be lost during migration?**

A: Re-ingestion creates fresh data from your source code. As long as your source code is intact, no data is lost. The original ChromaDB collections can be backed up before deletion.

**Q: How do I check the schema version of a collection?**

A: The schema version is logged on startup. You can also query collection metadata directly using the ChromaDB API or check the Manager UI logs.

## Performance

### Search Performance

- **Target**: Sub-500ms search responses for codebases under 10,000 chunks
- **Caching**: Identical queries cached for 60 seconds (configurable)
- **Optimization**: Vector similarity search with metadata filtering

### Ingestion Performance

Typical ingestion speeds (on modern hardware):

| Codebase Size | Files | Chunks | Time |
|---------------|-------|--------|------|
| Small | 100-500 | 500-2,000 | 10-30s |
| Medium | 500-2,000 | 2,000-10,000 | 30-120s |
| Large | 2,000-10,000 | 10,000-50,000 | 2-10min |

**Factors affecting speed:**
- File size and complexity
- Number of semantic chunks per file
- Embedding model (default: `Xenova/all-MiniLM-L6-v2`)
- CPU performance
- Disk I/O speed

### Memory Usage

- **Embedding Model**: ~100MB in memory (cached for process lifetime)
- **ChromaDB**: Minimal memory footprint (disk-backed)
- **Batch Processing**: Configurable batch size (default: 100 chunks)

### Optimization Tips

1. **Increase batch size** for faster ingestion (if you have sufficient RAM):
   ```json
   {
     "ingestion": {
       "batchSize": 200
     }
   }
   ```

2. **Adjust cache timeout** for frequently repeated queries:
   ```json
   {
     "search": {
       "cacheTimeoutSeconds": 120
     }
   }
   ```

3. **Use SSD storage** for ChromaDB persistence directory

4. **Limit max results** for faster responses:
   ```json
   {
     "search": {
       "defaultMaxResults": 25
     }
   }
   ```

## Security

### Local-First Architecture

- ✅ **No external API calls**: All processing happens locally
- ✅ **No telemetry**: No usage data is collected or transmitted
- ✅ **No cloud dependencies**: Embeddings generated locally with Hugging Face Transformers

### File System Security

- **Path validation**: All file paths are validated to prevent directory traversal
- **Permission checks**: Respects file system permissions
- **Gitignore support**: Automatically skips files in `.gitignore`

### Input Validation

- **Schema validation**: All inputs validated with AJV JSON schemas
- **Type checking**: Strict TypeScript types throughout
- **Sanitization**: User inputs sanitized before processing

### Resource Limits

- **Max file size**: 1MB default (configurable)
- **Max results**: 200 maximum per search
- **Batch size limits**: Prevents memory exhaustion

### Network Security

- **Localhost only**: Manager UI binds to localhost by default
- **No authentication**: Designed for local use only (do not expose to network)
- **Security headers**: Helmet.js for HTTP security headers

### Recommendations

1. **Do not expose Manager UI to public networks**
2. **Keep the package updated** for security patches
3. **Run regular security audits**: `npm audit`
4. **Use strong file system permissions** for data directories
5. **Back up data regularly** before major updates

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/teknologika/mcp-codebase-search.git
cd mcp-codebase-search

# Install dependencies
npm install

# Build the project
npm run build
```

### Scripts

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Security audit
npm run security

# Clean build artifacts
npm run clean
```

### Project Structure

```
src/
├── bin/                    # Entry points (mcp-server, ingest, manager)
├── domains/                # Domain-specific business logic
│   ├── codebase/          # Codebase CRUD operations
│   ├── search/            # Semantic search functionality
│   ├── ingestion/         # File scanning and indexing
│   ├── embedding/         # Embedding generation
│   └── parsing/           # Tree-sitter code parsing
├── infrastructure/         # External integrations
│   ├── chromadb/          # ChromaDB client wrapper
│   ├── mcp/               # MCP server implementation
│   └── fastify/           # Fastify server and routes
├── shared/                 # Shared utilities
│   ├── config/            # Configuration management
│   ├── logging/           # Structured logging with Pino
│   └── types/             # Shared TypeScript types
└── ui/                     # Web interface
    └── manager/           # Single-page management UI
```

### Testing

The project uses **Vitest** for testing with both unit tests and property-based tests.

**Test Coverage Requirements:**
- Minimum 80% statement coverage
- Minimum 80% branch coverage
- 90%+ coverage for critical paths

**Run specific tests:**
```bash
# Test a specific file
npm test -- src/domains/search/search.service.test.ts

# Test with coverage
npm run test:coverage

# Watch mode for TDD
npm run test:watch
```

### Contributing Guidelines

See [CONTRIBUTING.md](#contributing) below.

## Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

1. **Search existing issues** to avoid duplicates
2. **Use issue templates** when available
3. **Provide details**:
   - Node.js version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and logs

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes**:
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation
4. **Run tests**: `npm test`
5. **Run linter**: `npm run lint`
6. **Commit with clear messages**: `git commit -m "feat: add new feature"`
7. **Push to your fork**: `git push origin feature/my-feature`
8. **Open a pull request**

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Follow existing patterns
- **Naming**: Use descriptive names (camelCase for variables, PascalCase for classes)
- **Comments**: Document complex logic and public APIs
- **Tests**: Write both unit tests and property-based tests

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Build/tooling changes

### Development Workflow

1. **Create an issue** describing the feature or bug
2. **Discuss the approach** in the issue comments
3. **Implement the changes** with tests
4. **Submit a pull request** referencing the issue
5. **Address review feedback**
6. **Merge** once approved

### Areas for Contribution

- 🌐 **Language support**: Add more Tree-sitter grammars
- ⚡ **Performance**: Optimize search and ingestion
- 🎨 **UI improvements**: Enhance the Manager UI
- 📚 **Documentation**: Improve guides and examples
- 🧪 **Testing**: Increase test coverage
- 🐛 **Bug fixes**: Fix reported issues

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

**Teknologika**

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [ChromaDB](https://www.trychroma.com/) - Vector database
- [Tree-sitter](https://tree-sitter.github.io/) - Code parsing
- [Hugging Face](https://huggingface.co/) - Embedding models
- [Fastify](https://www.fastify.io/) - Web framework

---

**Questions or Issues?** Open an issue on [GitHub](https://github.com/teknologika/mcp-codebase-search/issues)

**Need Help?** Check the [Troubleshooting](#troubleshooting) section or start a discussion
