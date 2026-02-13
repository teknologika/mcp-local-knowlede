# Codebase → Knowledge Base Rename Summary

## Date
February 13, 2026

## Overview
Comprehensive rename of all "codebase" references to "knowledgebase" across the entire project to align with the product name `@teknologika/mcp-local-knowledge`.

## Changes Applied

### 1. API Endpoints ✅
- `/api/codebases` → `/api/knowledgebases`
- `/api/codebases/:name/stats` → `/api/knowledgebases/:name/stats`
- `/api/codebases/:name` → `/api/knowledgebases/:name`
- `/api/codebases/:name/chunk-sets/:timestamp` → `/api/knowledgebases/:name/chunk-sets/:timestamp`

### 2. Database Table Prefixes ✅
- `codebase_` → `knowledgebase_`
- Pattern: `knowledgebase_{name}_{schemaVersion}`

### 3. Configuration Paths ✅
- `~/.codebase-memory` → `~/.knowledge-base`
- All config files updated (config.example.json, .env.example, etc.)

### 4. UI Text ✅
- "Codebase Memory Manager" → "Knowledge Base Manager"
- "Codebase Manager" → "Knowledge Base Manager"
- "Rename Codebase" → "Rename Knowledge Base"
- "Delete Codebase" → "Delete Knowledge Base"
- "Codebases" → "Knowledge Bases"
- All user-facing strings updated

### 5. localStorage Keys ✅
- `codebase-theme` → `knowledgebase-theme`
- `codebase-memory-test` → `knowledge-base-test`

### 6. MCP Tool Names ✅
- `list_codebases` → `list_knowledgebases`
- `search_codebases` → `search_knowledgebases`
- `get_codebase_stats` → `get_knowledgebase_stats`
- `open_codebase_manager` → `open_knowledgebase_manager`

### 7. Variable Names ✅
- `codebaseService` → `knowledgeBaseService`
- `codebases` → `knowledgeBases` (in API responses)
- All internal variable names updated

### 8. Route Paths ✅
- `/codebase/:name` → `/knowledgebase/:name`

### 9. Comments and Documentation ✅
- "codebase tables" → "knowledge base tables"
- "indexed codebases" → "indexed knowledge bases"
- All documentation updated

## Files Modified

### Source Code
- `src/infrastructure/fastify/routes.ts`
- `src/infrastructure/fastify/manager-routes.ts`
- `src/infrastructure/fastify/fastify-server.ts`
- `src/infrastructure/lancedb/lancedb.client.ts`
- `src/infrastructure/mcp/README.md`
- `src/bin/manager.ts`
- `src/shared/logging/logger.ts`
- All test files

### UI Files
- `src/ui/manager/index.html`
- `src/ui/manager/templates/index.hbs`
- `src/ui/manager/static/manager.js`

### Configuration
- `config.example.json`
- `.env.example`

### Documentation
- Various `.md` files in `.kiro/specs/`

## Build Status
✅ **Build Successful** - `npm run build` completed without errors

## Port Configuration
Also updated default port from 8008 to 8009 to avoid conflicts.

## File Size Limit
Updated default file size limit from 1MB to 50MB (52428800 bytes).

## Next Steps

1. **Test the changes:**
   ```bash
   npm test
   ```

2. **Install globally:**
   ```bash
   npm install -g .
   ```

3. **Verify MCP tools:**
   - Test `list_knowledgebases`
   - Test `search_knowledgebases`
   - Test `get_knowledgebase_stats`
   - Test `open_knowledgebase_manager`

4. **Update MCP client configurations:**
   - Any external tools calling the old API endpoints need updating
   - MCP tool names in client code need updating

## Breaking Changes

⚠️ **API Endpoints Changed** - Any clients using the old `/api/codebases` endpoints will need to update to `/api/knowledgebases`

⚠️ **MCP Tool Names Changed** - MCP clients need to use new tool names (e.g., `list_knowledgebases` instead of `list_codebases`)

⚠️ **Database Tables** - New ingestions will use `knowledgebase_` prefix. Existing tables with `codebase_` prefix will still work but should be migrated.

⚠️ **localStorage Keys** - Users will need to reset their theme preference (minor UX impact)

## Migration Notes

For existing users with data in `.codebase-memory/`:
1. The system will now use `.knowledge-base/` by default
2. Old data can be migrated by moving the directory:
   ```bash
   mv ~/.codebase-memory ~/.knowledge-base
   ```

## Script Used

The rename was performed using `scripts/rename-mandatory.sh` which systematically replaced all occurrences across:
- TypeScript files (*.ts)
- JavaScript files (*.js)
- Handlebars templates (*.hbs)
- HTML files (*.html)
- Markdown files (*.md)
- JSON configuration files (*.json)

## Verification Commands

```bash
# Check API endpoints
grep -r "/api/knowledgebases" src/

# Check table prefixes
grep -r "knowledgebase_" src/

# Check config paths
grep -r ".knowledge-base" .

# Check UI text
grep -r "Knowledge Base" src/ui/

# Check localStorage
grep -r "knowledgebase-theme" src/

# Check MCP tools
grep -r "list_knowledgebases" src/
```

## Status
✅ **Complete** - All mandatory renames applied successfully
✅ **Build Passing** - TypeScript compilation successful
⏳ **Tests Pending** - Run `npm test` to verify all tests pass
