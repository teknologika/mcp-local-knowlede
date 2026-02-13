# Package Structure: mcp-local-knowledge

## Overview

Two separate packages working together:

1. **NPM Package**: `@teknologika/mcp-local-knowledge` (TypeScript/Node.js)
2. **PyPI Package**: `mcp-knowledge-docling` (Python/Docling)

---

## 1. NPM Package Structure

### Package Identity
```json
{
  "name": "@teknologika/mcp-local-knowledge",
  "version": "1.0.0",
  "description": "Local-first semantic search for documents using MCP protocol",
  "keywords": [
    "mcp",
    "model-context-protocol",
    "semantic-search",
    "documents",
    "knowledge-base",
    "embeddings",
    "vector-search",
    "docling",
    "local-first",
    "lancedb"
  ]
}
```

### Commands Provided
```bash
mcp-local-knowledge        # MCP server (stdio)
mcp-knowledge-ingest       # CLI for ingesting documents
mcp-knowledge-manager      # Web UI for management
```

### Directory Structure
```
@teknologika/mcp-local-knowledge/
│
├── package.json
├── README.md
├── LICENSE
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.json
├── .gitignore
│
├── src/                                    # TypeScript source
│   ├── bin/
│   │   ├── mcp-server.ts                  # MCP server entry point
│   │   ├── ingest.ts                      # Ingestion CLI
│   │   └── manager.ts                     # Manager UI server
│   │
│   ├── domains/
│   │   ├── knowledgebase/                 # RENAMED from codebase/
│   │   │   ├── __tests__/
│   │   │   ├── knowledgebase.service.ts
│   │   │   ├── knowledgebase.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── search/                        # Semantic search
│   │   │   ├── __tests__/
│   │   │   ├── search.service.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ingestion/                     # File scanning & indexing
│   │   │   ├── __tests__/
│   │   │   ├── file-scanner.service.ts
│   │   │   ├── ingestion.service.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── embedding/                     # Local embeddings
│   │   │   ├── __tests__/
│   │   │   ├── embedding.service.ts
│   │   │   └── index.ts
│   │   │
│   │   └── document/                      # NEW: Document processing
│   │       ├── __tests__/
│   │       ├── document-converter.service.ts
│   │       ├── document-chunker.service.ts
│   │       ├── document.types.ts
│   │       └── index.ts
│   │
│   ├── infrastructure/
│   │   ├── lancedb/                       # Vector database
│   │   │   ├── __tests__/
│   │   │   ├── lancedb.client.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── mcp/                           # MCP server
│   │   │   ├── __tests__/
│   │   │   ├── mcp-server.ts
│   │   │   ├── tool-schemas.ts            # UPDATED: new tool names
│   │   │   └── index.ts
│   │   │
│   │   ├── fastify/                       # Web server
│   │   │   ├── __tests__/
│   │   │   ├── fastify-server.ts
│   │   │   ├── routes.ts
│   │   │   ├── manager-routes.ts          # UPDATED: file upload
│   │   │   └── index.ts
│   │   │
│   │   └── python/                        # NEW: Python bridge
│   │       ├── __tests__/
│   │       ├── python-bridge.ts           # Spawns uvx processes
│   │       └── index.ts
│   │
│   ├── shared/
│   │   ├── config/
│   │   │   ├── __tests__/
│   │   │   ├── config.ts                  # UPDATED: new paths
│   │   │   └── index.ts
│   │   │
│   │   ├── logging/
│   │   │   ├── __tests__/
│   │   │   ├── logger.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── types/
│   │   │   └── index.ts                   # UPDATED: new types
│   │   │
│   │   └── utils/
│   │       └── file-classification.ts     # UPDATED: document types
│   │
│   └── ui/
│       └── manager/
│           ├── templates/
│           │   ├── layout.hbs             # UPDATED: branding
│           │   └── index.hbs              # UPDATED: file upload UI
│           └── static/
│               ├── manager.css            # UPDATED: upload styles
│               └── manager.js             # UPDATED: upload logic
│
├── scripts/
│   ├── install-uv.js                      # NEW: Auto-install uv
│   └── check-deps.js                      # NEW: Verify dependencies
│
├── dist/                                   # Compiled output (gitignored)
│   └── [mirrors src/ structure]
│
└── python-package/                         # NEW: Python package source
    ├── pyproject.toml
    ├── README.md
    ├── LICENSE
    ├── mcp_knowledge_docling/
    │   ├── __init__.py
    │   ├── cli.py
    │   ├── converter.py
    │   ├── chunker.py
    │   └── utils.py
    └── tests/
        ├── test_converter.py
        └── test_chunker.py
```

### Key Changes from Current Structure

**Removed:**
- ❌ `src/domains/parsing/` (tree-sitter code parsing)
- ❌ All tree-sitter dependencies
- ❌ Language-specific parsers

**Added:**
- ✅ `src/domains/document/` (document processing)
- ✅ `src/infrastructure/python/` (Python bridge)
- ✅ `scripts/install-uv.js` (auto-install uv)
- ✅ `python-package/` (Python package source)

**Renamed:**
- 🔄 `src/domains/codebase/` → `src/domains/knowledgebase/`
- 🔄 All "codebase" references → "knowledgebase"
- 🔄 `.knowledge-base/` → `.knowledge-base/`

---

## 2. PyPI Package Structure

### Package Identity
```toml
[project]
name = "mcp-knowledge-docling"
version = "1.0.0"
description = "Docling integration for MCP Local Knowledge"
requires-python = ">=3.10"
```

### Command Provided
```bash
mcp-knowledge-docling       # CLI entry point (called by uvx)
```

### Directory Structure
```
mcp-knowledge-docling/
│
├── pyproject.toml
├── README.md
├── LICENSE
├── .gitignore
│
├── mcp_knowledge_docling/
│   ├── __init__.py
│   │   """
│   │   MCP Knowledge Docling
│   │   Document conversion and chunking via Docling
│   │   """
│   │   __version__ = "1.0.0"
│   │
│   ├── cli.py
│   │   """
│   │   CLI entry point
│   │   Reads JSON from stdin, processes, writes JSON to stdout
│   │   """
│   │   def main():
│   │       # Read command from stdin
│   │       # Route to converter or chunker
│   │       # Write result to stdout
│   │
│   ├── converter.py
│   │   """
│   │   Document conversion using Docling
│   │   Supports: PDF, DOCX, PPTX, XLSX, HTML, MD, TXT, audio
│   │   """
│   │   def convert_document(file_path: str) -> dict:
│   │       # Initialize DocumentConverter
│   │       # Convert to markdown
│   │       # Extract metadata
│   │       # Return {markdown, metadata, docling_doc}
│   │
│   ├── chunker.py
│   │   """
│   │   Document chunking using HybridChunker
│   │   Token-aware, structure-aware chunking
│   │   """
│   │   def chunk_document(content: str, options: dict) -> dict:
│   │       # Initialize HybridChunker
│   │       # Generate chunks
│   │       # Contextualize chunks
│   │       # Return {chunks: [...]}
│   │
│   └── utils.py
│       """
│       Helper functions
│       """
│       def extract_metadata(doc) -> dict:
│           # Extract title, page count, etc.
│
└── tests/
    ├── __init__.py
    ├── test_converter.py
    │   # Test PDF conversion
    │   # Test DOCX conversion
    │   # Test error handling
    │
    └── test_chunker.py
        # Test HybridChunker
        # Test fallback chunking
        # Test token counting
```

---

## 3. How They Communicate

### Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Node.js (TypeScript)                                        │
│  @teknologika/mcp-local-knowledge                           │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  document-converter.service.ts                       │   │
│  │                                                       │   │
│  │  async convertDocument(filePath: string) {          │   │
│  │    const result = await pythonBridge.call({         │   │
│  │      action: 'convert',                              │   │
│  │      filePath: filePath                              │   │
│  │    });                                                │   │
│  │    return result;                                     │   │
│  │  }                                                    │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────▼─────────────────────────────┐   │
│  │  python-bridge.ts                                    │   │
│  │                                                       │   │
│  │  async call(command: object): Promise<any> {        │   │
│  │    const process = spawn('uvx', [                   │   │
│  │      'mcp-knowledge-docling@latest'                 │   │
│  │    ]);                                                │   │
│  │                                                       │   │
│  │    process.stdin.write(JSON.stringify(command));    │   │
│  │    const result = await readStdout(process);        │   │
│  │    return JSON.parse(result);                        │   │
│  │  }                                                    │   │
│  └───────────────────────┬─────────────────────────────┘   │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             │ spawn uvx
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  Python                                                       │
│  mcp-knowledge-docling                                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  cli.py                                              │   │
│  │                                                       │   │
│  │  def main():                                         │   │
│  │    command = json.loads(sys.stdin.read())           │   │
│  │                                                       │   │
│  │    if command['action'] == 'convert':               │   │
│  │      result = convert_document(                      │   │
│  │        command['filePath']                           │   │
│  │      )                                                │   │
│  │                                                       │   │
│  │    print(json.dumps(result))                         │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────▼─────────────────────────────┐   │
│  │  converter.py                                        │   │
│  │                                                       │   │
│  │  def convert_document(file_path: str) -> dict:      │   │
│  │    converter = DocumentConverter()                   │   │
│  │    result = converter.convert(file_path)            │   │
│  │    markdown = result.document.export_to_markdown()  │   │
│  │                                                       │   │
│  │    return {                                           │   │
│  │      'markdown': markdown,                           │   │
│  │      'metadata': extract_metadata(result),          │   │
│  │      'docling_doc': serialize(result.document)      │   │
│  │    }                                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Message Format

**Request (stdin)**:
```json
{
  "action": "convert",
  "filePath": "/path/to/document.pdf"
}
```

**Response (stdout)**:
```json
{
  "markdown": "# Document Title\n\nContent...",
  "metadata": {
    "title": "Document Title",
    "format": "pdf",
    "pageCount": 10,
    "wordCount": 5000,
    "hasImages": true,
    "hasTables": true
  },
  "docling_doc": { ... }
}
```

---

## 4. Installation & Usage

### For End Users

```bash
# Step 1: Install npm package
npm install -g @teknologika/mcp-local-knowledge

# Step 2: Configure MCP client (e.g., Claude Desktop)
# Edit ~/.config/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "uvx",
      "args": ["mcp-knowledge-docling@latest"]
    }
  }
}

# Step 3: Use it!
# - Python package auto-installs on first use
# - Everything cached for subsequent uses
```

### For Developers

```bash
# Clone repo
git clone https://github.com/teknologika/mcp-local-knowledge.git
cd mcp-local-knowledge

# Install Node.js dependencies
npm install

# Build TypeScript
npm run build

# Test
npm test

# Publish npm package
npm publish

# Publish Python package
cd python-package
python -m build
twine upload dist/*
```

---

## 5. Data Storage

### Local Data Directory

**Old**: `~/.knowledge-base/`  
**New**: `~/.knowledge-base/`

```
~/.knowledge-base/
├── lancedb/                    # Vector database
│   ├── kb_my-docs_1_0_0/      # Knowledge base tables
│   └── kb_work-docs_1_0_0/
├── models/                     # Embedding models cache
│   └── Xenova/
│       └── all-MiniLM-L6-v2/
└── config.json                 # User configuration
```

### LanceDB Table Naming

**Old**: `codebase_{name}_{version}`  
**New**: `kb_{name}_{version}`

Example: `kb_my-documents_1_0_0`

---

## 6. Configuration

### Default Configuration

```json
{
  "lancedb": {
    "persistPath": "~/.knowledge-base/lancedb"
  },
  "embedding": {
    "modelName": "Xenova/all-MiniLM-L6-v2",
    "cachePath": "~/.knowledge-base/models"
  },
  "server": {
    "port": 8008,
    "host": "localhost"
  },
  "mcp": {
    "transport": "stdio"
  },
  "ingestion": {
    "batchSize": 100,
    "maxFileSize": 10485760
  },
  "search": {
    "defaultMaxResults": 50,
    "cacheTimeoutSeconds": 60
  },
  "document": {
    "pythonCommand": "uvx",
    "pythonPackage": "mcp-knowledge-docling@latest",
    "conversionTimeout": 30000,
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "maxTokens": 512
  },
  "logging": {
    "level": "info"
  },
  "schemaVersion": "1.0.0"
}
```

---

## Summary

**Two packages, one solution:**

1. **NPM Package** (`@teknologika/mcp-local-knowledge`):
   - Main application (TypeScript/Node.js)
   - MCP server, CLI tools, Manager UI
   - Calls Python via bridge
   - ~5-10MB package size

2. **PyPI Package** (`mcp-knowledge-docling`):
   - Python helper (Docling integration)
   - Auto-installed by uvx on first use
   - ~2MB code + ~500MB dependencies
   - Transparent to end users

**User experience:**
- Install npm package: `npm install -g @teknologika/mcp-local-knowledge`
- Configure MCP client with `uvx` command
- Everything else happens automatically!
