# LanceDB Migration Status

## Overview
Migrating from ChromaDB (requires server) to LanceDB (file-based, no server required)

## Completed
- ✅ Updated package.json (removed chromadb, added vectordb)
- ✅ Created LanceDBClientWrapper (src/infrastructure/lancedb/lancedb.client.ts)
- ✅ Updated Config type (chromadb → lancedb)
- ✅ Updated DEFAULT_CONFIG
- ✅ Updated config schema

## In Progress
- ⏳ Update all service imports and usages

## Remaining Tasks

### 1. Update Entry Points
- [ ] src/bin/mcp-server.ts - Change ChromaDBClientWrapper to LanceDBClientWrapper
- [ ] src/bin/ingest.ts - Change ChromaDBClientWrapper to LanceDBClientWrapper  
- [ ] src/bin/manager.ts - Change ChromaDBClientWrapper to LanceDBClientWrapper

### 2. Update Domain Services
- [ ] src/domains/codebase/codebase.service.ts - Adapt to LanceDB API
- [ ] src/domains/search/search.service.ts - Adapt to LanceDB API
- [ ] src/domains/ingestion/ingestion.service.ts - Adapt to LanceDB API

### 3. Update Tests
- [ ] src/domains/codebase/__tests__/codebase.service.test.ts
- [ ] src/domains/search/__tests__/search.service.test.ts
- [ ] src/domains/ingestion/__tests__/performance.test.ts
- [ ] src/__tests__/integration-mocked.test.ts

### 4. Update Infrastructure
- [ ] Delete src/infrastructure/chromadb/ directory
- [ ] Update any remaining references

### 5. Install Dependencies
- [ ] npm install (to get vectordb package)
- [ ] npm run build
- [ ] npm test

### 6. Update Documentation
- [ ] README.md - Remove ChromaDB server requirements
- [ ] CONFIG.md - Update configuration examples
- [ ] .env.example - Update paths

## Key API Differences

### ChromaDB → LanceDB Mapping
- `ChromaClient` → `Connection` (from vectordb)
- `Collection` → `Table`
- `collection.add()` → `table.add()`
- `collection.query()` → `table.search()`
- `collection.get()` → `table.search()` with filter
- `collection.delete()` → `table.delete()`
- Metadata stored as regular columns in LanceDB

## Notes
- LanceDB is truly local-first - no server needed!
- LanceDB uses Apache Arrow format for efficiency
- Embedding dimension: 384 (for MiniLM model)
- Schema version tracking via `_schemaVersion` column
