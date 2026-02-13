---
title: Refactor to mcp-local-knowledge
status: planning
created: 2026-02-11
updated: 2026-02-11
---

# Refactor: mcp-codebase-search → mcp-local-knowledge

## Overview

Transform the current code-focused MCP server into a general-purpose document knowledge base system that supports multiple document formats via Docling integration.

## Reference Implementation

**IMPORTANT**: A complete reference implementation is available in the `mongodb-rag-agent` codebase, which has been indexed and is searchable via the MCP codebase search tools.

To explore the reference implementation, use these MCP tools:
- `search_knowledgebases` with `codebaseName: "mongodb-rag-agent"` to find specific implementations
- Key search queries to explore:
  - "docling document conversion PDF DOCX"
  - "HybridChunker intelligent document splitting"
  - "DocumentConverter initialization configuration"
  - "audio transcription whisper ASR"
  - "ingestion pipeline document processing"

The MongoDB RAG Agent demonstrates:
- Python-based Docling integration for document conversion
- Support for PDF, DOCX, PPTX, XLSX, HTML, Markdown, and audio files
- HybridChunker for structure-aware, token-aware document chunking
- Whisper ASR integration for audio transcription
- Complete ingestion pipeline with fallback handling

## Objectives

1. **Rename Package**: `@teknologika/mcp-codebase-search` → `@teknologika/mcp-local-knowledge`
2. **Remove Code-Specific Features**: Strip out tree-sitter, language detection, and code parsing
3. **Add Document Support**: Integrate Docling for multi-format document ingestion
4. **Rename MCP Tools**: Update tool names to reflect knowledge base focus
5. **Enhance UI**: Add drag-and-drop file upload and folder selection

## Package Structure & Naming

### Two Separate Packages

#### 1. NPM Package (Main Package)
**Name**: `@teknologika/mcp-local-knowledge`  
**Published to**: npmjs.com  
**Size**: ~5-10MB  
**Contains**:
- TypeScript/Node.js code
- MCP server implementation
- CLI tools (ingest, manager)
- Manager UI (Fastify web app)
- Python bridge (calls uvx)
- LanceDB integration
- Embedding service

**Installation**:
```bash
npm install -g @teknologika/mcp-local-knowledge
```

**Commands provided**:
- `mcp-local-knowledge` - MCP server
- `mcp-knowledge-ingest` - Ingestion CLI
- `mcp-knowledge-manager` - Manager UI

**Directory structure**:
```
@teknologika/mcp-local-knowledge/
├── package.json
├── README.md
├── LICENSE
├── dist/                          # Compiled TypeScript
│   ├── bin/
│   │   ├── mcp-server.js
│   │   ├── ingest.js
│   │   └── manager.js
│   ├── domains/
│   │   ├── knowledgebase/
│   │   ├── search/
│   │   ├── ingestion/
│   │   ├── embedding/
│   │   └── document/             # NEW: Document processing
│   ├── infrastructure/
│   │   ├── lancedb/
│   │   ├── mcp/
│   │   ├── fastify/
│   │   └── python/               # NEW: Python bridge
│   │       ├── python-bridge.js
│   │       └── index.js
│   ├── shared/
│   └── ui/
└── scripts/
    ├── install-uv.js             # Auto-install uv
    └── check-deps.js             # Verify dependencies
```

#### 2. PyPI Package (Python Helper)
**Name**: `mcp-knowledge-docling`  
**Published to**: pypi.org  
**Size**: ~2MB (code only, dependencies downloaded separately)  
**Contains**:
- Python code for Docling integration
- Document converter
- Document chunker
- CLI entry point

**Installation** (automatic via uvx):
```bash
# Users never run this manually - uvx handles it
uvx mcp-knowledge-docling@latest
```

**Directory structure** (separate repo or subfolder):
```
mcp-knowledge-docling/
├── pyproject.toml
├── README.md
├── LICENSE
├── mcp_knowledge_docling/
│   ├── __init__.py
│   ├── cli.py                    # Entry point
│   ├── converter.py              # Document conversion
│   ├── chunker.py                # Document chunking
│   └── utils.py                  # Helper functions
└── tests/
    ├── test_converter.py
    └── test_chunker.py
```

**pyproject.toml**:
```toml
[project]
name = "mcp-knowledge-docling"
version = "0.1.0"
description = "Docling integration for MCP Local Knowledge"
authors = [{name = "Teknologika"}]
requires-python = ">=3.10"
dependencies = [
    "docling>=2.0.0",
    "transformers>=4.30.0",
    "torch>=2.0.0",
]

[project.scripts]
mcp-knowledge-docling = "mcp_knowledge_docling.cli:main"

[project.urls]
Homepage = "https://github.com/teknologika/mcp-local-knowledge"
Repository = "https://github.com/teknologika/mcp-local-knowledge"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### How They Work Together

```
┌─────────────────────────────────────────────────────────────┐
│  User installs npm package                                   │
│  $ npm install -g @teknologika/mcp-local-knowledge          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Postinstall script runs                                     │
│  - Attempts to auto-install uv                               │
│  - Shows instructions if fails                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  User configures MCP client (Claude Desktop)                 │
│  {                                                            │
│    "mcpServers": {                                           │
│      "knowledge-base": {                                     │
│        "command": "uvx",                                     │
│        "args": ["mcp-knowledge-docling@latest"]             │
│      }                                                        │
│    }                                                          │
│  }                                                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  First use: uvx auto-installs Python package                │
│  - Downloads Python 3.10+ if needed                          │
│  - Creates isolated virtual environment                      │
│  - Installs mcp-knowledge-docling from PyPI                 │
│  - Installs dependencies (docling, transformers, torch)     │
│  - Caches everything (~500MB total)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Node.js calls Python via python-bridge.ts                  │
│  - Spawns: uvx mcp-knowledge-docling                        │
│  - Sends JSON via stdin                                      │
│  - Receives JSON via stdout                                  │
│  - Handles errors and timeouts                               │
└─────────────────────────────────────────────────────────────┘
```

### Repository Structure Options

**Option 1: Monorepo (Recommended)**
```
mcp-local-knowledge/
├── package.json                  # NPM package
├── src/                          # TypeScript source
├── python-package/               # Python package
│   ├── pyproject.toml
│   └── mcp_knowledge_docling/
├── .github/
│   └── workflows/
│       ├── npm-publish.yml       # Publish to npm
│       └── pypi-publish.yml      # Publish to PyPI
└── README.md
```

**Option 2: Separate Repos**
```
teknologika/mcp-local-knowledge/     # NPM package
teknologika/mcp-knowledge-docling/   # Python package
```

### Publishing Workflow

**NPM Package**:
```bash
# Build and publish
npm run build
npm publish

# Users install
npm install -g @teknologika/mcp-local-knowledge
```

**PyPI Package**:
```bash
# Build and publish
cd python-package
python -m build
twine upload dist/*

# Users never install manually - uvx handles it
```

### Version Synchronization

Keep versions in sync or independent:

**Synchronized** (recommended for initial release):
- NPM: `@teknologika/mcp-local-knowledge@1.0.0`
- PyPI: `mcp-knowledge-docling==1.0.0`

**Independent** (for mature project):
- NPM: `@teknologika/mcp-local-knowledge@2.5.0`
- PyPI: `mcp-knowledge-docling==1.3.0`
- NPM package specifies compatible Python package version

### Remove (Code-Specific)
- ❌ Tree-sitter parsing (`src/domains/parsing/`)
- ❌ Language detection service
- ❌ Code-specific chunk types (function, class, method)
- ❌ Programming language support (C#, Java, JS, TS, Python)
- ❌ AST-aware chunking
- ❌ Code file classification
- ❌ Simple fallback chunking (removed - use Docling HybridChunker exclusively)

### Add (Document-Specific)
- ✅ Python bridge for Docling integration
- ✅ Document converter service
- ✅ Document chunking service (HybridChunker)
- ✅ Support for: PDF, DOCX, PPTX, XLSX, HTML, MD, TXT
- ✅ Audio transcription (MP3, WAV, M4A, FLAC via Whisper)
- ✅ Drag-and-drop file upload in UI
- ✅ Folder selection and processing in UI

### Keep (Core Functionality)
- ✅ LanceDB vector storage
- ✅ Local embeddings (Hugging Face Transformers)
- ✅ Semantic search
- ✅ MCP server infrastructure
- ✅ Manager UI (with enhancements)
- ✅ CLI ingestion tool
- ✅ Configuration system
- ✅ Logging and error handling

## Renamed Components

### Package & Commands
| Old | New |
|-----|-----|
| `@teknologika/mcp-codebase-search` | `@teknologika/mcp-local-knowledge` |
| `mcp-codebase-search` | `mcp-local-knowledge` |
| `mcp-codebase-ingest` | `mcp-knowledge-ingest` |
| `mcp-codebase-manager` | `mcp-knowledge-manager` |

### MCP Tools
| Old | New |
|-----|-----|
| `list_knowledgebases` | `list_knowledgebases` |
| `search_knowledgebases` | `search_knowledgebases` |
| `get_knowledgebase_stats` | `get_knowledgebase_stats` |
| `open_knowledgebase_manager` | `open_knowledgebase_manager` |

### Directories & Files
| Old | New |
|-----|-----|
| `.knowledge-base/` | `.knowledge-base/` |
| `codebase.service.ts` | `knowledgebase.service.ts` |
| `codebase/` domain | `knowledgebase/` domain |

### Configuration Keys
| Old | New |
|-----|-----|
| `lancedb.persistPath` default | `~/.knowledge-base/lancedb` |
| `embedding.cachePath` default | `~/.knowledge-base/models` |

### Types & Interfaces
| Old | New |
|-----|-----|
| `Codebase` | `KnowledgeBase` |
| `CodebaseMetadata` | `KnowledgeBaseMetadata` |
| `CodebaseStats` | `KnowledgeBaseStats` |
| `language` field | `documentType` field |
| `chunkType` (function/class) | `chunkType` (paragraph/section/table) |

## Implementation Plan

### Phase 1: Project Rename & Cleanup (Foundation)

**Goal**: Rename package and remove code-specific functionality

#### 1.1 Update Package Configuration
- [ ] Update `package.json`:
  - Change `name` to `@teknologika/mcp-local-knowledge`
  - Update `description` to reflect document focus
  - Update `bin` commands (mcp-local-knowledge, mcp-knowledge-ingest, mcp-knowledge-manager)
  - Update `keywords` (remove code-specific, add document-specific)
  - Update repository URLs
- [ ] Update `README.md`:
  - Replace all references to "codebase" with "knowledge base"
  - Update feature descriptions
  - Remove language support section
  - Add document format support section
- [ ] Update `tsconfig.json` if needed
- [ ] Update `.gitignore` (`.knowledge-base/` instead of `.knowledge-base/`)

#### 1.2 Remove Code-Specific Domains
- [ ] Delete `src/domains/parsing/` (tree-sitter parsing)
- [ ] Remove tree-sitter dependencies from `package.json`:
  - `tree-sitter`
  - `tree-sitter-c-sharp`
  - `tree-sitter-java`
  - `tree-sitter-javascript`
  - `tree-sitter-python`
  - `tree-sitter-typescript`
- [ ] Remove language detection utilities
- [ ] Remove code file classification logic

#### 1.3 Rename Core Domain
- [ ] Rename `src/domains/codebase/` → `src/domains/knowledgebase/`
- [ ] Update all imports throughout the project
- [ ] Rename types:
  - `Codebase` → `KnowledgeBase`
  - `CodebaseMetadata` → `KnowledgeBaseMetadata`
  - `CodebaseStats` → `KnowledgeBaseStats`
- [ ] Update service methods and variable names
- [ ] Update test files

#### 1.4 Update Configuration System
- [ ] Update `src/shared/config/config.ts`:
  - Change default paths from `.knowledge-base` to `.knowledge-base`
  - Update configuration schema
  - Update validation messages
- [ ] Update `.env.example` with new paths
- [ ] Create migration note for existing users

#### 1.5 Update Shared Types
- [ ] Update `src/shared/types/index.ts`:
  - Remove `Language` type
  - Remove code-specific `ChunkType` values
  - Add `DocumentType` type (pdf, docx, pptx, xlsx, html, markdown, text, audio)
  - Add document-specific `ChunkType` values (paragraph, section, table, heading)
  - Update `SearchResult` interface
  - Update `ChunkMetadata` interface

### Phase 2: Python Bridge Infrastructure

**Goal**: Create bridge between Node.js and Python for Docling integration using `uv`/`uvx`

#### 2.1 Python Package Strategy - REVISED (Pragmatic Approach)

After evaluating options, here's the recommended approach:

**Option A: `uvx` (Recommended - Standard MCP Pattern)**
- Used by AWS MCP servers and most Python MCP servers
- Auto-installs Python + dependencies on first use
- Small npm package size (~5MB)
- Requires `uv` to be installed (we auto-install in postinstall)

**Option B: PyInstaller (Alternative - True Zero-Config)**
- Bundle Python executables for each platform
- No external dependencies needed
- **Problem**: Docling + transformers + torch = 500MB-1GB per platform
- **Problem**: npm package would be 1-3GB (unacceptable for npm)
- **Verdict**: Not practical for ML-heavy applications

**Option C: Hybrid (Best of Both Worlds)**
- Use `uvx` as primary method (small, standard)
- Provide optional PyInstaller binaries as separate downloads
- Users choose based on their needs

**DECISION: Use Option A (`uvx`) with excellent UX**

**Why this is the right choice:**
1. ✅ Standard pattern used by official MCP servers
2. ✅ Small npm package size
3. ✅ Automatic Python management
4. ✅ Easy updates (just update PyPI package)
5. ✅ Works with Claude Desktop out of the box
6. ✅ We can auto-install `uv` in postinstall script

**Architecture:**
```
npm install → postinstall script → auto-install uv → done!
                                         ↓
User configures MCP client → uvx mcp-knowledge-docling@latest
                                         ↓
                              (auto-installs everything on first use)
```

**What Gets Installed:**
1. **npm package** (~5MB): TypeScript/Node.js code
2. **uv binary** (~20MB): Auto-installed via postinstall
3. **Python + dependencies** (~500MB): Auto-installed by uvx on first use

**Total disk space:** ~525MB (reasonable for ML application)
**npm package size:** ~5MB (excellent!)
**User action required:** None (if postinstall succeeds) or one command

**Package Structure:**
```
# NPM package (this repo)
src/infrastructure/python/
├── python-bridge.ts           # Node.js bridge (calls uvx)
└── index.ts

# PyPI package (separate repo/publish)
python-package/
├── mcp_knowledge_docling/
│   ├── __init__.py
│   ├── converter.py           # Document conversion
│   ├── chunker.py             # Document chunking
│   └── cli.py                 # CLI entry point
├── pyproject.toml
├── README.md
└── LICENSE
```

**Alternative for Advanced Users:**
We can document how to use PyInstaller binaries if they want truly standalone:
```bash
# Download pre-built binary (optional)
curl -L https://github.com/.../releases/download/v1.0.0/mcp-knowledge-docling-macos -o ~/.local/bin/mcp-knowledge-docling
chmod +x ~/.local/bin/mcp-knowledge-docling

# Configure to use binary instead of uvx
{
  "command": "mcp-knowledge-docling",  // instead of uvx
  "args": []
}
```

#### 2.2 Create Python Package (for PyPI)

- [ ] Create `python-package/` directory (separate from npm package)
- [ ] Create `pyproject.toml`:
  ```toml
  [project]
  name = "mcp-knowledge-docling"
  version = "0.1.0"
  description = "Docling integration for MCP Local Knowledge"
  requires-python = ">=3.10"
  dependencies = [
      "docling>=2.0.0",
      "transformers>=4.30.0",
      "torch>=2.0.0",
  ]
  
  [project.scripts]
  mcp-knowledge-docling = "mcp_knowledge_docling.cli:main"
  
  [build-system]
  requires = ["hatchling"]
  build-backend = "hatchling.build"
  
  [project.urls]
  Homepage = "https://github.com/teknologika/mcp-local-knowledge"
  Repository = "https://github.com/teknologika/mcp-local-knowledge"
  ```

- [ ] Implement `mcp_knowledge_docling/converter.py`:
  - Accept file path via stdin (JSON)
  - Initialize DocumentConverter
  - Convert document to markdown
  - Extract metadata (title, page count, word count, etc.)
  - Return result via stdout (JSON)
  - Handle errors gracefully

- [ ] Implement `mcp_knowledge_docling/chunker.py`:
  - Accept DoclingDocument via stdin
  - Initialize HybridChunker with tokenizer
  - Generate chunks with contextualization
  - Return chunks via stdout (JSON)
  - NO fallback - if chunking fails, return error

- [ ] Implement `mcp_knowledge_docling/cli.py`:
  ```python
  #!/usr/bin/env python3
  import sys
  import json
  from .converter import convert_document
  from .chunker import chunk_document
  
  def main():
      # Read command from stdin
      input_data = sys.stdin.read()
      command = json.loads(input_data)
      
      try:
          if command['action'] == 'convert':
              result = convert_document(command['filePath'])
          elif command['action'] == 'chunk':
              result = chunk_document(command['content'], command['options'])
          else:
              result = {'error': f"Unknown action: {command['action']}"}
          
          # Write result to stdout
          print(json.dumps(result))
      except Exception as e:
          print(json.dumps({'error': str(e)}))
          sys.exit(1)
  
  if __name__ == '__main__':
      main()
  ```

- [ ] Add README.md with usage instructions
- [ ] Add LICENSE file
- [ ] Publish to PyPI: `python -m build && twine upload dist/*`

#### 2.3 Create Python Bridge Service

- [ ] Implement `python-bridge.ts`:
  ```typescript
  import { spawn } from 'child_process';
  
  export class PythonBridge {
    async callDocling(action: string, params: any): Promise<any> {
      // Use uvx to run the package in isolated environment
      const process = spawn('uvx', [
        'mcp-knowledge-docling',
        '--',
        JSON.stringify({ action, ...params })
      ]);
      
      // Handle stdin/stdout JSON communication
      // Process lifecycle management
      // Error handling and retries
      // Timeout handling
    }
    
    async checkUvAvailability(): Promise<boolean> {
      // Check if uv/uvx is installed
    }
  }
  ```

- [ ] Add `uv` availability check with helpful error messages
- [ ] Add fallback to direct Python execution if `uvx` not available
- [ ] Implement process lifecycle management
- [ ] Add timeout handling (30s default for conversion)
- [ ] Add retry logic for transient failures

#### 2.4 Installation & Setup (Hybrid Approach)

**Strategy: Try to auto-install `uv`, fallback to user instructions**

We'll attempt to auto-install `uv` during npm postinstall, but provide clear instructions if it fails.

**User Installation Flow:**

```bash
# Step 1: Install our npm package
npm install -g @teknologika/mcp-local-knowledge

# During postinstall:
# - Script attempts to auto-install uv
# - If successful: ✅ Ready to use!
# - If fails: Shows clear installation instructions

# Step 2: Configure MCP client (e.g., Claude Desktop)
# Add to claude_desktop_config.json:
{
  "mcpServers": {
    "knowledge-base": {
      "command": "uvx",
      "args": ["mcp-knowledge-docling@latest"]
    }
  }
}

# On first use:
# - uvx auto-downloads Python 3.10+ if needed
# - uvx auto-installs mcp-knowledge-docling from PyPI
# - uvx auto-installs all dependencies (docling, transformers, torch)
# - Everything is cached for instant subsequent use
```

**What Gets Auto-Installed:**
- ✅ `uv` binary (via postinstall script, if possible)
- ✅ Python interpreter (via `uv` on first use)
- ✅ `mcp-knowledge-docling` package (via `uvx` on first use)
- ✅ All Python dependencies (via `uvx` on first use)

**Implementation Tasks:**

- [ ] Create `scripts/install-uv.js`:
  ```javascript
  #!/usr/bin/env node
  import { execSync } from 'child_process';
  import { platform } from 'os';
  
  async function installUv() {
    try {
      // Check if uv already installed
      execSync('uvx --version', { stdio: 'ignore' });
      console.log('✓ uv is already installed');
      return true;
    } catch {
      console.log('Installing uv...');
    }
    
    try {
      const os = platform();
      
      if (os === 'win32') {
        // Windows: Use PowerShell
        execSync(
          'powershell -c "irm https://astral.sh/uv/install.ps1 | iex"',
          { stdio: 'inherit' }
        );
      } else {
        // macOS/Linux: Use shell script
        execSync(
          'curl -LsSf https://astral.sh/uv/install.sh | sh',
          { stdio: 'inherit' }
        );
      }
      
      console.log('✓ uv installed successfully!');
      return true;
    } catch (error) {
      console.error('✗ Failed to auto-install uv');
      console.log('\nPlease install uv manually:');
      console.log('\nmacOS/Linux:');
      console.log('  curl -LsSf https://astral.sh/uv/install.sh | sh');
      console.log('\nWindows:');
      console.log('  powershell -c "irm https://astral.sh/uv/install.ps1 | iex"');
      console.log('\nOr visit: https://docs.astral.sh/uv/getting-started/installation/');
      return false;
    }
  }
  
  installUv();
  ```

- [ ] Update `package.json`:
  ```json
  {
    "scripts": {
      "postinstall": "node scripts/install-uv.js",
      "check-deps": "node scripts/check-deps.js"
    }
  }
  ```

- [ ] Create `scripts/check-deps.js` (for manual verification):
  ```javascript
  #!/usr/bin/env node
  import { execSync } from 'child_process';
  
  function checkDependency(cmd, name) {
    try {
      execSync(cmd, { stdio: 'ignore' });
      console.log(`✓ ${name} is installed`);
      return true;
    } catch {
      console.log(`✗ ${name} is NOT installed`);
      return false;
    }
  }
  
  console.log('Checking dependencies...\n');
  const uvInstalled = checkDependency('uvx --version', 'uv/uvx');
  
  if (!uvInstalled) {
    console.log('\nInstall uv:');
    console.log('  npm run postinstall');
    console.log('  or visit: https://docs.astral.sh/uv/');
  } else {
    console.log('\n✓ All dependencies ready!');
  }
  ```

- [ ] Add helpful error messages in `python-bridge.ts`:
  ```typescript
  // In python-bridge.ts
  async checkUvxAvailability(): Promise<boolean> {
    try {
      await execAsync('uvx --version');
      return true;
    } catch {
      throw new Error(`
        uvx is not installed or not in PATH.
        
        Please install uv:
        
        macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh
        Windows: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
        
        Or run: npm run postinstall
        
        Visit: https://docs.astral.sh/uv/getting-started/installation/
      `);
    }
  }
  ```

- [ ] Update README with clear installation section:
  ```markdown
  ## Installation
  
  ```bash
  npm install -g @teknologika/mcp-local-knowledge
  ```
  
  The installer will attempt to install `uv` automatically. If it fails,
  you can install it manually:
  
  **macOS/Linux:**
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
  
  **Windows:**
  ```powershell
  powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```
  
  That's it! Python and all dependencies will be automatically 
  installed on first use.
  ```

#### 2.5 Add Python Bridge Tests

- [ ] Test `uvx` process spawning
- [ ] Test JSON communication protocol
- [ ] Test error handling
- [ ] Test timeout scenarios
- [ ] Test process cleanup
- [ ] Test fallback to direct Python
- [ ] Test with missing dependencies

### Phase 3: Document Processing Services

**Goal**: Implement document conversion and chunking

#### 3.1 Create Document Domain
- [ ] Create `src/domains/document/` directory
- [ ] Define document types in `document.types.ts`:
  ```typescript
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
  }
  
  interface DocumentChunk {
    content: string;
    index: number;
    tokenCount: number;
    metadata: ChunkMetadata;
  }
  ```

#### 3.2 Implement Document Converter Service
- [ ] Create `document-converter.service.ts`:
  - Detect document type by extension
  - Route to Python bridge for Docling conversion
  - Handle conversion errors with fallbacks
  - Support formats: `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.html`, `.md`, `.txt`
  - Extract and normalize metadata
- [ ] Add support for audio files (`.mp3`, `.wav`, `.m4a`, `.flac`):
  - Use Docling's Whisper ASR integration
  - Configure ASR pipeline options
  - Handle transcription errors
- [ ] Implement fallback text extraction for unsupported formats
- [ ] Add progress reporting for long conversions

#### 3.3 Implement Document Chunker Service
- [ ] Create `document-chunker.service.ts`:
  - Use Docling's HybridChunker exclusively (via Python bridge)
  - Token-aware chunking (respects embedding model limits)
  - Structure-aware (preserves headings, sections, tables)
  - Contextualization (includes heading hierarchy)
  - NO fallback chunking - if HybridChunker fails, the document ingestion fails
- [ ] Configure chunking parameters:
  - `max_tokens`: 512 (default)
  - `merge_peers`: true
  - Tokenizer: `sentence-transformers/all-MiniLM-L6-v2` (matches embedding model)

#### 3.4 Add Document Service Tests
- [ ] Test document type detection
- [ ] Test conversion for each format
- [ ] Test chunking with HybridChunker
- [ ] Test error handling (no fallback - errors should propagate)
- [ ] Test metadata extraction
- [ ] Test audio transcription

### Phase 4: Update Ingestion Pipeline

**Goal**: Integrate document processing into ingestion

#### 4.1 Update File Scanner
- [ ] Update `src/domains/ingestion/file-scanner.service.ts`:
  - Add document file patterns
  - Remove code file patterns
  - Update file classification
  - Add document type detection
- [ ] Update supported extensions:
  ```typescript
  const DOCUMENT_EXTENSIONS = [
    '.pdf', '.docx', '.doc', '.pptx', '.ppt',
    '.xlsx', '.xls', '.html', '.htm',
    '.md', '.markdown', '.txt',
    '.mp3', '.wav', '.m4a', '.flac'
  ];
  ```

#### 4.2 Update Ingestion Service
- [ ] Update `src/domains/ingestion/ingestion.service.ts`:
  - Remove tree-sitter parsing logic
  - Add document converter integration
  - Add document chunker integration (HybridChunker only)
  - Update progress reporting
  - Handle document-specific errors
  - Add document type to metadata
  - If HybridChunker fails, fail the document ingestion (no fallback)
- [ ] Update batch processing for documents
- [ ] Add conversion timeout handling
- [ ] Implement retry logic for failed conversions (but not for chunking failures)

#### 4.3 Update File Classification
- [ ] Update `src/shared/utils/file-classification.ts`:
  - Remove code-specific classification
  - Add document type classification
  - Keep test file detection (for markdown docs)
  - Remove library file detection (not relevant for docs)

#### 4.4 Update Ingestion Tests
- [ ] Test document file scanning
- [ ] Test document conversion integration
- [ ] Test chunking integration
- [ ] Test error handling
- [ ] Test progress reporting
- [ ] Test batch processing

### Phase 5: Update MCP Server

**Goal**: Rename tools and update schemas

#### 5.1 Update Tool Schemas
- [ ] Update `src/infrastructure/mcp/tool-schemas.ts`:
  - Rename `list_knowledgebases` → `list_knowledgebases`
  - Rename `search_knowledgebases` → `search_knowledgebases`
  - Rename `get_knowledgebase_stats` → `get_knowledgebase_stats`
  - Rename `open_knowledgebase_manager` → `open_knowledgebase_manager`
- [ ] Update input schemas:
  - Replace `codebaseName` with `knowledgebaseName`
  - Replace `language` filter with `documentType` filter
  - Update descriptions and examples
- [ ] Update output schemas:
  - Replace `language` field with `documentType`
  - Update `chunkType` values
  - Add document-specific metadata fields

#### 5.2 Update MCP Server Implementation
- [ ] Update `src/infrastructure/mcp/mcp-server.ts`:
  - Update tool handlers
  - Update error messages
  - Update logging
- [ ] Update tool descriptions for AI assistants
- [ ] Update examples in tool schemas

#### 5.3 Update MCP Tests
- [ ] Update tool schema tests
- [ ] Update integration tests
- [ ] Test renamed tools
- [ ] Test new schemas

### Phase 6: Update Search Service

**Goal**: Adapt search for document-based queries

#### 6.1 Update Search Service
- [ ] Update `src/domains/search/search.service.ts`:
  - Replace `language` filter with `documentType` filter
  - Update result formatting
  - Update metadata handling
  - Keep semantic search logic (unchanged)
  - Keep filtering logic (test files still relevant)

#### 6.2 Update Search Tests
- [ ] Test document type filtering
- [ ] Test search with new metadata
- [ ] Test result formatting

### Phase 7: Update CLI Tools

**Goal**: Rename commands and update help text

#### 7.1 Update Ingest CLI
- [ ] Rename `src/bin/ingest.ts` (keep filename, update command name)
- [ ] Update command name in help text
- [ ] Update descriptions and examples
- [ ] Update progress messages
- [ ] Update error messages
- [ ] Add document format information to output

#### 7.2 Update Manager CLI
- [ ] Rename `src/bin/manager.ts` (keep filename, update command name)
- [ ] Update command name in help text
- [ ] Update descriptions

#### 7.3 Update MCP Server CLI
- [ ] Update `src/bin/mcp-server.ts`
- [ ] Update command name in help text
- [ ] Update descriptions

### Phase 8: Enhance Manager UI

**Goal**: Add drag-and-drop and folder selection

#### 8.1 Update UI Templates
- [ ] Update `src/ui/manager/templates/layout.hbs`:
  - Update title and branding
  - Replace "Codebase" with "Knowledge Base"
- [ ] Update `src/ui/manager/templates/index.hbs`:
  - Update tab labels
  - Update search interface
  - Update manage interface
  - Add file upload section

#### 8.2 Add File Upload UI
- [ ] Create file upload section in "Ingest" tab:
  - Drag-and-drop zone for files
  - File input for single file selection
  - Folder input for folder selection
  - File list with remove buttons
  - Upload progress indicators
  - Success/error messages
- [ ] Add file type validation (client-side)
- [ ] Add file size warnings
- [ ] Add upload queue management

#### 8.3 Update Manager Routes
- [ ] Update `src/infrastructure/fastify/manager-routes.ts`:
  - Add `/api/upload/file` endpoint (multipart/form-data)
  - Add `/api/upload/folder` endpoint (multipart/form-data)
  - Add `/api/upload/progress/:uploadId` endpoint (SSE)
  - Handle file uploads
  - Process uploaded files
  - Return progress updates
- [ ] Add file validation (server-side)
- [ ] Add temporary file cleanup
- [ ] Add upload session management

#### 8.4 Update Manager JavaScript
- [ ] Update `src/ui/manager/static/manager.js`:
  - Add drag-and-drop handlers
  - Add file input handlers
  - Add folder input handlers
  - Add upload queue management
  - Add progress tracking
  - Add SSE connection for progress
  - Update search to use new API
  - Update manage to use new API

#### 8.5 Update Manager CSS
- [ ] Update `src/ui/manager/static/manager.css`:
  - Style drag-and-drop zone
  - Style file upload UI
  - Style progress indicators
  - Update branding colors if needed

#### 8.6 Update Manager Tests
- [ ] Test file upload endpoint
- [ ] Test folder upload endpoint
- [ ] Test progress tracking
- [ ] Test file validation
- [ ] Test error handling

### Phase 9: Update Documentation

**Goal**: Comprehensive documentation updates

#### 9.1 Update README.md
- [ ] Update title and description
- [ ] Update feature list (remove code, add documents)
- [ ] Update installation instructions
- [ ] Update quick start guide
- [ ] Update usage examples
- [ ] Update MCP client configuration
- [ ] Remove "Supported Languages" section
- [ ] Add "Supported Document Formats" section
- [ ] Update architecture diagrams
- [ ] Update troubleshooting section
- [ ] Update all command examples

#### 9.2 Update Configuration Documentation
- [ ] Document new default paths
- [ ] Document Python requirements
- [ ] Document Docling configuration
- [ ] Add migration guide for existing users

#### 9.3 Create Migration Guide
- [ ] Create `MIGRATION.md`:
  - Explain breaking changes
  - Provide migration steps
  - Document data migration (if needed)
  - Provide rollback instructions

#### 9.4 Update Product Documentation
- [ ] Update `product/Codebase-Memory-MCP-PRD.md` → `product/Knowledge-Base-MCP-PRD.md`
- [ ] Update steering files in `.kiro/steering/`
- [ ] Update any other documentation files

### Phase 10: Testing & Quality Assurance

**Goal**: Comprehensive testing of refactored system

#### 10.1 Unit Tests
- [ ] Run all unit tests: `npm test`
- [ ] Achieve 80%+ coverage
- [ ] Fix any failing tests
- [ ] Add missing tests

#### 10.2 Integration Tests
- [ ] Test end-to-end document ingestion
- [ ] Test search across different document types
- [ ] Test MCP tool integration
- [ ] Test Manager UI workflows
- [ ] Test Python bridge reliability

#### 10.3 Manual Testing
- [ ] Test ingestion with sample documents:
  - [ ] PDF files
  - [ ] DOCX files
  - [ ] PPTX files
  - [ ] XLSX files
  - [ ] HTML files
  - [ ] Markdown files
  - [ ] Text files
  - [ ] Audio files (MP3, WAV)
- [ ] Test search functionality
- [ ] Test Manager UI:
  - [ ] Search tab
  - [ ] Manage tab
  - [ ] Ingest tab (drag-and-drop)
  - [ ] File upload
  - [ ] Folder upload
- [ ] Test MCP tools in Claude Desktop
- [ ] Test error scenarios
- [ ] Test performance with large documents

#### 10.4 Performance Testing
- [ ] Benchmark document conversion speed
- [ ] Benchmark search performance
- [ ] Test with large knowledge bases (1000+ documents)
- [ ] Test memory usage
- [ ] Optimize bottlenecks

### Phase 11: Deployment Preparation

**Goal**: Prepare for release

#### 11.1 Version Update
- [ ] Update version in `package.json` to `1.0.0` (major version bump)
- [ ] Update CHANGELOG.md with breaking changes
- [ ] Tag release in git

#### 11.2 Build & Package
- [ ] Run `npm run clean`
- [ ] Run `npm run build`
- [ ] Test built package locally
- [ ] Run `npm pack` and test installation

#### 11.3 Python Setup Script
- [ ] Create `scripts/setup-python.sh` for Unix
- [ ] Create `scripts/setup-python.bat` for Windows
- [ ] Add setup instructions to README
- [ ] Test Python setup on clean systems

#### 11.4 Pre-publish Checklist
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Migration guide ready
- [ ] Python dependencies documented
- [ ] Examples tested
- [ ] Security audit passed: `npm audit`

## Supported Document Formats

### Document Formats (via Docling)
| Format | Extensions | Features |
|--------|-----------|----------|
| PDF | `.pdf` | OCR support, table extraction, image extraction |
| Word | `.docx`, `.doc` | Full formatting, tables, images |
| PowerPoint | `.pptx`, `.ppt` | Slides, notes, images |
| Excel | `.xlsx`, `.xls` | Tables, formulas, charts |
| HTML | `.html`, `.htm` | Structure preservation, links |
| Markdown | `.md`, `.markdown` | Native support, structure-aware |
| Text | `.txt` | Plain text |

### Audio Formats (via Whisper ASR)
| Format | Extensions | Features |
|--------|-----------|----------|
| MP3 | `.mp3` | Transcription with timestamps |
| WAV | `.wav` | Transcription with timestamps |
| M4A | `.m4a` | Transcription with timestamps |
| FLAC | `.flac` | Transcription with timestamps |

## Technical Architecture Changes

### Before (Code-Focused)
```
Source Code → Tree-sitter Parser → Code Chunks → Embeddings → LanceDB
```

### After (Document-Focused)
```
Documents → Python Bridge → Docling Converter → DoclingDocument
                                                    ↓
                                          Docling HybridChunker (ONLY)
                                                    ↓
                                          Contextualized Chunks
                                                    ↓
                                          Embeddings → LanceDB

Note: No fallback chunking - HybridChunker is the only chunking method
```

## Breaking Changes

### For Users
1. **Command names changed**: All commands renamed from `mcp-codebase-*` to `mcp-knowledge-*`
2. **MCP tool names changed**: All tools renamed from `*_codebases` to `*_knowledgebases`
3. **Data directory changed**: `.knowledge-base/` → `.knowledge-base/`
4. **Configuration paths changed**: Update config files with new default paths
5. **No more code parsing**: Tree-sitter removed, focus on documents only
6. **New dependencies**: Python 3.9+ and Docling required

### For Developers
1. **Domain renamed**: `codebase` → `knowledgebase`
2. **Types renamed**: `Codebase` → `KnowledgeBase`, etc.
3. **Imports changed**: Update all import paths
4. **API changed**: `language` → `documentType`, chunk types changed
5. **New infrastructure**: Python bridge added

## Migration Path for Existing Users

### Step 1: Backup Data
```bash
cp -r ~/.knowledge-base ~/.knowledge-base.backup
```

### Step 2: Uninstall Old Version
```bash
npm uninstall -g @teknologika/mcp-codebase-search
```

### Step 3: Install New Version
```bash
npm install -g @teknologika/mcp-local-knowledge
```

### Step 4: Setup Python Environment
```bash
pip install docling transformers torch
```

### Step 5: Migrate Data (Optional)
```bash
# Move data to new location
mv ~/.knowledge-base ~/.knowledge-base

# Or re-ingest documents
mcp-knowledge-ingest --path ./my-docs --name my-docs
```

### Step 6: Update MCP Client Configuration
Update `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "mcp-local-knowledge",
      "args": []
    }
  }
}
```

## Dependencies

### New Dependencies

**Python (via `uv`/`uvx`):**
- **uv**: Modern Python package manager (Rust-based)
  - Installation: `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - Or: `pip install uv`
  - Or: `brew install uv` (macOS)
  - Or: `cargo install uv` (if you have Rust)
- **Python 3.10+**: Required for Docling (broad compatibility)
- **mcp-knowledge-docling**: Our Python package (auto-installed via `uvx`)
  - `docling>=2.0.0`: Document conversion library
  - `transformers>=4.30.0`: For HybridChunker tokenizer
  - `torch>=2.0.0`: PyTorch for model support

**Why `uv`/`uvx`?**
- Used by Claude Desktop and most MCP servers
- Automatic virtual environment management
- No manual Python setup needed
- Extremely fast (Rust-based)
- Works like `npx` for Python
- Handles all dependency isolation

### Removed Dependencies
- `tree-sitter`
- `tree-sitter-c-sharp`
- `tree-sitter-java`
- `tree-sitter-javascript`
- `tree-sitter-python`
- `tree-sitter-typescript`

### Kept Dependencies
- `@huggingface/transformers`: Local embeddings
- `@lancedb/lancedb`: Vector storage
- `@modelcontextprotocol/sdk`: MCP protocol
- `fastify`: Web server
- All other existing dependencies

## Success Criteria

- [ ] All tests passing (80%+ coverage)
- [ ] All document formats supported and tested
- [ ] Python bridge working reliably
- [ ] Manager UI with drag-and-drop functional
- [ ] MCP tools working in Claude Desktop
- [ ] Documentation complete and accurate
- [ ] Migration guide tested
- [ ] Performance acceptable (sub-1s for most documents)
- [ ] No regressions in core functionality

## Timeline Estimate

- **Phase 1-2**: 2-3 days (Foundation + Python bridge)
- **Phase 3-4**: 3-4 days (Document services + Ingestion)
- **Phase 5-6**: 1-2 days (MCP + Search updates)
- **Phase 7-8**: 2-3 days (CLI + UI enhancements)
- **Phase 9**: 1-2 days (Documentation)
- **Phase 10**: 2-3 days (Testing)
- **Phase 11**: 1 day (Deployment prep)

**Total**: 12-18 days

## Risks & Mitigation

### Risk: Python Dependency Complexity
**Mitigation**: Provide clear setup scripts, detailed error messages, fallback to simple text extraction

### Risk: Docling Performance
**Mitigation**: Implement timeouts, progress reporting, caching, parallel processing

### Risk: Breaking Changes Impact
**Mitigation**: Comprehensive migration guide, version bump to 1.0.0, clear communication

### Risk: UI Complexity (Drag-and-Drop)
**Mitigation**: Use proven libraries, progressive enhancement, thorough testing

### Risk: Python Bridge Reliability
**Mitigation**: Robust error handling, process monitoring, automatic restarts, comprehensive tests

## Notes

- Keep the refactoring incremental and testable
- Maintain backward compatibility where possible (data format)
- Focus on user experience for document ingestion
- Ensure Python setup is well-documented
- Consider providing Docker image for easier deployment
- Monitor performance with large documents
- Plan for future enhancements (more formats, better chunking)

