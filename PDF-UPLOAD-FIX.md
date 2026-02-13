# PDF Upload Fix - Manager UI

## Issue
PDF uploads from the Manager UI were failing silently, resulting in 0 chunks being created despite successful file upload and conversion.

## Root Cause
The document chunking pipeline was attempting to use the Docling SDK's `chunk()` method, which is only available in API mode. Since we switched to CLI mode for document conversion (to use `--image-export-mode placeholder`), the SDK client doesn't have the `chunk()` method available.

**Error**: `TypeError: this.docling.chunk is not a function`

Additionally, the fallback text extraction from the Docling document object was returning empty strings because the JSON structure from CLI mode doesn't have a simple `text` or `content` field.

## Solution
Modified the ingestion pipeline to use markdown-based structure-aware chunking for all documents converted via CLI mode:

### Changes Made

1. **Upload Route** (`src/infrastructure/fastify/manager-routes.ts`)
   - Added detailed logging for upload process
   - Added error response when processing fails
   - Return `chunksCreated` count in success response

2. **Ingestion Service** (`src/domains/ingestion/ingestion.service.ts`)
   - Modified `ingestFiles()` to use markdown-based chunking when `doclingDocument` is present
   - Added comprehensive logging at each step (conversion, chunking, storage)
   - Applied same fix to `ingestCodebase()` for consistency

3. **Document Converter** (`src/domains/document/document-converter.service.ts`)
   - Enhanced error logging in `executeDoclingCLI()`
   - Added detailed logging of stdout/stderr from docling process
   - Better error messages when docling CLI fails to spawn

4. **Document Chunker** (`src/domains/document/document-chunker.service.ts`)
   - Enhanced error logging in `chunkWithDocling()` fallback
   - Added logging for text extraction and fallback chunking

## Results

### Before Fix
- Upload: ✓ (file received)
- Conversion: ✓ (130KB markdown, 15K words)
- Chunking: ✗ (0 chunks created)
- Storage: ✗ (nothing to store)

### After Fix
- Upload: ✓ (file received)
- Conversion: ✓ (130KB markdown, 15K words)
- Chunking: ✓ (270 chunks created)
  - 99 headings detected
  - 76 section chunks
  - 194 paragraph chunks
- Storage: ✓ (all chunks stored in LanceDB)

## Technical Details

### Chunking Strategy
The structure-aware chunker now:
1. Detects document structure (99 headings in test PDF)
2. Splits content by headings
3. Preserves heading hierarchy in chunk metadata
4. Uses recursive splitting for large sections
5. Maintains chunk overlap for context

### Performance
- Conversion: ~24 seconds (with OCR)
- Chunking: <100ms (structure-aware)
- Embedding generation: ~2 seconds (270 chunks)
- Total upload time: ~26 seconds for 878KB PDF

## Testing
Verified with `Vets-main-regulations.pdf` (878KB):
- Successfully uploaded via Manager UI
- 270 chunks created and stored
- Knowledge base stats show correct counts
- Chunks are searchable via semantic search

## Files Modified
- `src/infrastructure/fastify/manager-routes.ts`
- `src/domains/ingestion/ingestion.service.ts`
- `src/domains/document/document-converter.service.ts`
- `src/domains/document/document-chunker.service.ts`

## Cleanup
- Removed test scripts: `test-upload.js`, `test-mcp-server.sh`, `test-shutdown.js`
- Cleaned up temporary conversion files in `temp/` directory
