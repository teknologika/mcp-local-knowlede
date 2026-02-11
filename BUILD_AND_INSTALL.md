# Build and Installation Complete ✅

## Summary

Successfully built and installed the `@teknologika/mcp-codebase-search` package globally.

## Build Process

### 1. Clean Previous Build
```bash
npm run clean
```
Removed the `dist/` directory to ensure a fresh build.

### 2. Compile TypeScript
```bash
npm run build
```
Compiled all TypeScript files to JavaScript in the `dist/` directory.

### 3. Global Installation
```bash
npm link --force
```
Created global symlinks for all three executables.

## Installed Commands

The following commands are now available globally:

### 1. MCP Server
```bash
mcp-codebase-search
```
Starts the MCP (Model Context Protocol) server for AI assistant integration.

**Usage**: Run directly or configure in your MCP client (e.g., Claude Desktop, Kiro)

### 2. Ingestion CLI
```bash
mcp-codebase-ingest --help
```
Command-line tool for ingesting codebases into the search system.

**Options**:
- `-p, --path <directory>` - Path to codebase directory
- `-n, --name <name>` - Unique name for the codebase
- `-c, --config <file>` - Path to configuration file
- `-V, --version` - Output version number
- `-h, --help` - Display help

**Example**:
```bash
mcp-codebase-ingest --path ~/projects/my-app --name my-app
```

### 3. Manager UI
```bash
mcp-codebase-manager --help
```
Starts the web-based management interface for viewing and managing codebases.

**Options**:
- `-p, --port <number>` - Port number (default: 8008)
- `-h, --host <address>` - Host address (default: localhost)
- `-c, --config <file>` - Path to configuration file
- `-V, --version` - Output version number
- `--help` - Display help

**Example**:
```bash
mcp-codebase-manager --port 8080
```

## Installation Locations

### Executables
```
/opt/homebrew/bin/
├── mcp-codebase-search -> ../lib/node_modules/@teknologika/mcp-codebase-search/dist/bin/mcp-server.js
├── mcp-codebase-ingest -> ../lib/node_modules/@teknologika/mcp-codebase-search/dist/bin/ingest.js
└── mcp-codebase-manager -> ../lib/node_modules/@teknologika/mcp-codebase-search/dist/bin/manager.js
```

### Package Location
```
/opt/homebrew/lib/node_modules/@teknologika/mcp-codebase-search/
```

## Verification

### Check Installation
```bash
which mcp-codebase-search
which mcp-codebase-ingest
which mcp-codebase-manager
```

### Test Commands
```bash
mcp-codebase-ingest --version
mcp-codebase-manager --help
```

## Build Output Structure

```
dist/
├── bin/
│   ├── ingest.js           # Ingestion CLI
│   ├── manager.js          # Manager UI server
│   └── mcp-server.js       # MCP server
├── domains/
│   ├── codebase/           # Codebase management
│   ├── embedding/          # Embedding generation
│   ├── ingestion/          # File scanning and indexing
│   ├── parsing/            # Tree-sitter parsing
│   └── search/             # Semantic search
├── infrastructure/
│   ├── fastify/            # HTTP server
│   ├── lancedb/            # Vector database
│   └── mcp/                # MCP protocol
└── shared/
    ├── config/             # Configuration
    ├── logging/            # Logging utilities
    └── types/              # TypeScript types
```

## Next Steps

### 1. Configure MCP Client

Add to your MCP client configuration (e.g., `~/.kiro/settings/mcp.json`):

```json
{
  "mcpServers": {
    "codebase-search": {
      "command": "mcp-codebase-search",
      "args": [],
      "env": {
        "LANCEDB_PERSIST_PATH": "~/.codebase-memory/lancedb",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 2. Ingest Your First Codebase

```bash
# Ingest a codebase
mcp-codebase-ingest --path ~/projects/my-app --name my-app

# View progress in the logs
# The system will:
# 1. Scan all supported files
# 2. Parse code with Tree-sitter
# 3. Generate embeddings
# 4. Store in LanceDB
```

### 3. Start the Manager UI

```bash
# Start the web interface
mcp-codebase-manager

# Open browser to http://localhost:8008
# View codebases, statistics, and manage data
```

### 4. Use with AI Assistant

Once configured in your MCP client, you can:
- Search across all ingested codebases
- Find similar code patterns
- Navigate code semantically
- Get context-aware code suggestions

## Troubleshooting

### Permission Denied
If you get permission errors:
```bash
chmod +x dist/bin/*.js
npm link --force
```

### Command Not Found
Ensure npm global bin is in your PATH:
```bash
echo $PATH | grep npm
# Should show npm bin directory
```

Add to your shell profile if needed:
```bash
export PATH="/opt/homebrew/bin:$PATH"
```

### Module Not Found
Rebuild the package:
```bash
npm run clean
npm run build
npm link --force
```

## Uninstallation

To remove the global installation:
```bash
npm unlink -g @teknologika/mcp-codebase-search
```

## Development Mode

For development, use the watch scripts instead:
```bash
npm run dev:mcp      # MCP server with auto-reload
npm run dev:ingest   # Ingestion CLI with auto-reload
npm run dev          # Manager UI with auto-reload
```

## Production Deployment

For production deployment:
```bash
npm run prepublishOnly  # Runs clean, build, test, and lint
npm publish             # Publish to npm registry
```

---

**Status**: ✅ Built and Installed  
**Version**: 0.1.0  
**Node Version**: 23.0.0+  
**Installation Type**: Global (npm link)
