# REVISED: Using docling-sdk (TypeScript Native)

## Decision: Use `docling-sdk` Instead of Python Bridge

After discovering `docling-sdk`, we're revising the approach to use this TypeScript-native solution.

## Why docling-sdk is Better

### Original Plan (Python Bridge + uvx)
```
Node.js → Python Bridge → uvx → Python Package → Docling
```
- ❌ Complex: Two packages (npm + PyPI)
- ❌ Requires uv installation
- ❌ JSON over stdin/stdout communication
- ❌ Process management overhead
- ✅ Works: But unnecessarily complex

### New Plan (docling-sdk)
```
Node.js → docling-sdk (TypeScript) → Python Docling CLI
```
- ✅ Simple: One npm package
- ✅ Pure TypeScript integration
- ✅ Built-in error handling
- ✅ Type-safe API
- ✅ Multiple modes (CLI/API/Web)

## Package Structure (Revised)

### Single NPM Package
**Name**: `@teknologika/mcp-local-knowledge`  
**Size**: ~5-10MB (including docling-sdk)

**Dependencies**:
```json
{
  "dependencies": {
    "docling-sdk": "^2.0.4",
    "@huggingface/transformers": "^3.8.1",
    "@lancedb/lancedb": "^0.5.0",
    // ... other existing dependencies
  }
}
```

**No separate PyPI package needed!**

## Implementation

### 1. Document Converter Service

```typescript
// src/domains/document/document-converter.service.ts
import { Docling } from 'docling-sdk';
import { logger } from '../../shared/logging/index.js';

export class DocumentConverterService {
  private client: Docling;

  constructor() {
    // Use CLI mode - wraps Python Docling
    this.client = new Docling({
      cli: {
        outputDir: './temp',
        // Python Docling will be called via CLI
      }
    });
  }

  async convertDocument(filePath: string): Promise<DocumentConversionResult> {
    try {
      logger.info(`Converting document: ${filePath}`);
      
      const result = await this.client.convert(
        filePath,
        path.basename(filePath),
        {
          to_formats: ['md', 'json'],
          // Docling options
        }
      );

      return {
        markdown: result.document.md_content,
        metadata: {
          title: result.document.name,
          format: path.extname(filePath),
          pageCount: result.document.pages?.length || 0,
          wordCount: this.countWords(result.document.md_content),
          hasImages: result.document.pictures?.length > 0,
          hasTables: result.document.tables?.length > 0,
        },
        doclingDocument: result.document,
      };
    } catch (error) {
      logger.error(`Document conversion failed: ${error}`);
      throw new DocumentConversionError(
        `Failed to convert ${filePath}`,
        error
      );
    }
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}
```

### 2. Document Chunker Service

```typescript
// src/domains/document/document-chunker.service.ts
import { Docling } from 'docling-sdk';
import { logger } from '../../shared/logging/index.js';

export class DocumentChunkerService {
  private client: Docling;

  constructor() {
    this.client = new Docling({
      cli: {
        outputDir: './temp',
      }
    });
  }

  async chunkDocument(
    content: string,
    options: ChunkingOptions
  ): Promise<DocumentChunk[]> {
    try {
      // Use docling-sdk's chunking capabilities
      const result = await this.client.chunk(content, {
        max_tokens: options.maxTokens || 512,
        chunker_type: 'hybrid', // or 'hierarchical'
      });

      return result.chunks.map((chunk, index) => ({
        content: chunk.text,
        index,
        tokenCount: chunk.token_count,
        metadata: {
          chunkType: chunk.meta?.doc_items?.[0]?.label || 'paragraph',
          hasContext: true,
        },
      }));
    } catch (error) {
      logger.error(`Document chunking failed: ${error}`);
      // Fallback to simple chunking
      return this.simpleChunk(content, options);
    }
  }

  private simpleChunk(
    content: string,
    options: ChunkingOptions
  ): DocumentChunk[] {
    // Fallback implementation
    const chunks: DocumentChunk[] = [];
    const chunkSize = options.chunkSize || 1000;
    const overlap = options.chunkOverlap || 200;

    let start = 0;
    let index = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunkText = content.slice(start, end);

      chunks.push({
        content: chunkText,
        index,
        tokenCount: Math.ceil(chunkText.length / 4),
        metadata: {
          chunkType: 'paragraph',
          hasContext: false,
        },
      });

      start = end - overlap;
      index++;
    }

    return chunks;
  }
}
```

### 3. Installation & Setup

**User Installation**:
```bash
# Step 1: Install npm package
npm install -g @teknologika/mcp-local-knowledge

# Step 2: Install Python Docling (one-time)
pip install docling

# Step 3: Configure MCP client
# No special configuration needed!
```

**Postinstall Script**:
```javascript
// scripts/check-docling.js
import { execSync } from 'child_process';

function checkDocling() {
  try {
    execSync('docling --version', { stdio: 'ignore' });
    console.log('✓ Docling is installed');
    return true;
  } catch {
    console.log('✗ Docling is not installed');
    console.log('\nPlease install Docling:');
    console.log('  pip install docling');
    console.log('\nOr visit: https://github.com/DS4SD/docling');
    return false;
  }
}

checkDocling();
```

## Modes Comparison

### CLI Mode (Recommended)
```typescript
const client = new Docling({ cli: { outputDir: './temp' } });
```
- ✅ Full Docling features
- ✅ Supports all document formats
- ✅ HybridChunker available
- ⚠️ Requires Python Docling installed
- ⚠️ Slower (spawns Python process)

### API Mode (Optional - For Scale)
```typescript
const client = new Docling({ api: { baseUrl: 'http://localhost:5001' } });
```
- ✅ Fast (HTTP API)
- ✅ Can run on separate server
- ✅ Async with progress tracking
- ⚠️ Requires Docling Serve running
- 💡 Good for production deployments

### Web Mode (Future Enhancement)
```typescript
import { createWebClient } from 'docling-sdk/web';
const client = createWebClient({ device: 'webgpu' });
```
- ✅ Runs in browser
- ✅ No server needed
- ✅ WebGPU/WASM powered
- ⚠️ Limited to OCR
- 💡 Good for Manager UI file preview

## Updated Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User installs npm package                                   │
│  $ npm install -g @teknologika/mcp-local-knowledge          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Postinstall checks for Python Docling                       │
│  - If found: ✓ Ready to use                                 │
│  - If not found: Shows installation instructions             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  TypeScript code uses docling-sdk                            │
│                                                               │
│  import { Docling } from 'docling-sdk';                     │
│  const client = new Docling({ cli: {...} });                │
│  const result = await client.convert(file);                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  docling-sdk spawns Python Docling CLI                      │
│  - Handles process management                                │
│  - Parses output                                             │
│  - Returns typed results                                     │
└─────────────────────────────────────────────────────────────┘
```

## Benefits Summary

### Compared to Original Plan (uvx + Python Bridge)

| Aspect | Original Plan | docling-sdk Plan |
|--------|--------------|------------------|
| **Packages** | 2 (npm + PyPI) | 1 (npm only) |
| **Code to write** | Python + TypeScript bridge | TypeScript only |
| **Type safety** | Manual JSON schemas | Built-in TypeScript types |
| **Error handling** | Custom implementation | Built-in |
| **Testing** | Test both packages | Test one package |
| **Maintenance** | Two codebases | One codebase |
| **User setup** | Install uv | Install pip package |
| **Package size** | ~5MB npm + Python | ~5MB npm total |

### What We Gain

1. **Simpler codebase**: No Python code to maintain
2. **Better DX**: TypeScript types throughout
3. **Easier testing**: No cross-language testing
4. **Faster development**: Use existing SDK
5. **More features**: Get API/Web modes for free
6. **Better errors**: SDK handles error cases
7. **Active maintenance**: SDK is actively developed

### What We Keep

1. **Local-first**: Still runs locally
2. **No cloud**: No external API calls
3. **Full features**: All Docling capabilities
4. **Performance**: Similar performance
5. **Flexibility**: Can switch to API mode later

## Migration from Spec

### Remove from Plan
- ❌ Phase 2.2: Create Python Package (for PyPI)
- ❌ Phase 2.3: Create Python Bridge Service
- ❌ Python package publishing workflow
- ❌ PyPI package maintenance

### Add to Plan
- ✅ Add `docling-sdk` dependency
- ✅ Implement DocumentConverterService using SDK
- ✅ Implement DocumentChunkerService using SDK
- ✅ Add Docling installation check
- ✅ Update documentation

### Simplified Timeline
- **Original estimate**: 12-18 days
- **New estimate**: 8-12 days (30% faster!)
- **Reason**: No Python package to build/maintain

## Recommendation

**Use docling-sdk with CLI mode** for the initial release:

1. Simple installation: `npm install -g @teknologika/mcp-local-knowledge`
2. One-time setup: `pip install docling`
3. Everything else just works!

**Future enhancements**:
- Add API mode support for production deployments
- Add Web mode for browser-based document preview
- Provide Docker image with Docling Serve pre-configured

This is a much cleaner, simpler, and more maintainable solution! 🎉
