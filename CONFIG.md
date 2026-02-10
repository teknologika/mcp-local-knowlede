# Configuration Guide

This document provides detailed information about all configuration options for the Codebase Memory MCP Server.

## Configuration Methods

The system supports two configuration methods:

1. **JSON Configuration File**: `~/.codebase-memory/config.json`
2. **Environment Variables**: Set in your shell or `.env` file

**Priority**: Environment variables take precedence over the configuration file.

## Quick Start

### Using Configuration File

1. Copy the example configuration:
   ```bash
   cp config.example.json ~/.codebase-memory/config.json
   ```

2. Edit `~/.codebase-memory/config.json` to customize settings

3. Restart services for changes to take effect

### Using Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to set your values

3. Source the file or restart your shell

## Configuration Options

### ChromaDB Configuration

Controls the vector database for storing code embeddings and metadata.

#### `chromadb.persistPath`

- **Type**: String
- **Default**: `~/.codebase-memory/chromadb`
- **Environment Variable**: `CHROMADB_PERSIST_PATH`
- **Description**: Directory where ChromaDB persists vector data. The system will create this directory if it doesn't exist.
- **Example**: `~/.codebase-memory/chromadb`

---

### Embedding Model Configuration

Controls how code chunks are converted to vector embeddings.

#### `embedding.modelName`

- **Type**: String
- **Default**: `Xenova/all-MiniLM-L6-v2`
- **Environment Variable**: `EMBEDDING_MODEL_NAME`
- **Description**: Hugging Face model name for generating embeddings. This model provides a good balance of speed and accuracy.
- **Alternative Models**:
  - `Xenova/all-MiniLM-L12-v2` - Larger, more accurate, slower
  - `Xenova/paraphrase-MiniLM-L6-v2` - Optimized for paraphrasing
- **Note**: Changing models requires re-ingesting all codebases
- **Example**: `Xenova/all-MiniLM-L6-v2`

#### `embedding.cachePath`

- **Type**: String
- **Default**: `~/.codebase-memory/models`
- **Environment Variable**: `EMBEDDING_CACHE_PATH`
- **Description**: Directory where embedding models are cached after download. Models are ~100MB and downloaded once on first use.
- **Example**: `~/.codebase-memory/models`

---

### Fastify Server Configuration

Settings for the Manager UI web server.

#### `server.port`

- **Type**: Number
- **Default**: `8008`
- **Environment Variable**: `SERVER_PORT`
- **Description**: Port number for the Manager UI HTTP server. Change this if port 8008 is already in use.
- **Valid Range**: 1024-65535
- **Example**: `8008`

#### `server.host`

- **Type**: String
- **Default**: `localhost`
- **Environment Variable**: `SERVER_HOST`
- **Description**: Host address to bind the server to.
- **Warning**: Do not change to `0.0.0.0` unless you understand the security implications. The Manager UI has no authentication and should only be accessible locally.
- **Example**: `localhost`

---

### MCP Server Configuration

Settings for the Model Context Protocol server.

#### `mcp.transport`

- **Type**: String
- **Default**: `stdio`
- **Description**: Transport mechanism for MCP communication. Currently only `stdio` is supported (standard input/output). This is the standard transport for MCP servers.
- **Valid Values**: `stdio`
- **Example**: `stdio`

---

### Ingestion Configuration

Controls how codebases are scanned and indexed.

#### `ingestion.batchSize`

- **Type**: Number
- **Default**: `100`
- **Environment Variable**: `INGESTION_BATCH_SIZE`
- **Description**: Number of chunks to process in each batch during ingestion.
  - Higher values = faster ingestion but more memory usage
  - Lower values = slower ingestion but less memory usage
- **Recommended Range**: 50-200
- **Example**: `100`

#### `ingestion.maxFileSize`

- **Type**: Number (bytes)
- **Default**: `1048576` (1MB)
- **Environment Variable**: `INGESTION_MAX_FILE_SIZE`
- **Description**: Maximum file size in bytes to process. Files larger than this are skipped with a warning. Increase if you have large source files that need indexing.
- **Example Values**:
  - `524288` = 512KB
  - `1048576` = 1MB
  - `2097152` = 2MB
- **Example**: `1048576`

---

### Search Configuration

Controls search behavior and performance.

#### `search.defaultMaxResults`

- **Type**: Number
- **Default**: `50`
- **Environment Variable**: `SEARCH_DEFAULT_MAX_RESULTS`
- **Description**: Default maximum number of results to return per search. Can be overridden per-query via the `maxResults` parameter. Lower values = faster responses.
- **Maximum Allowed**: 200 (enforced by the system)
- **Example**: `50`

#### `search.cacheTimeoutSeconds`

- **Type**: Number (seconds)
- **Default**: `60`
- **Environment Variable**: `SEARCH_CACHE_TIMEOUT_SECONDS`
- **Description**: Cache timeout in seconds for search results. Identical queries within this timeframe return cached results. Set to 0 to disable caching (not recommended). Higher values = better performance but potentially stale results.
- **Example**: `60`

---

### Logging Configuration

Controls log output verbosity and format.

#### `logging.level`

- **Type**: String
- **Default**: `info`
- **Environment Variable**: `LOG_LEVEL`
- **Description**: Log level for all components.
- **Valid Values**:
  - `debug` - Detailed execution flow, variable values, performance metrics
  - `info` - Normal operations (ingestion started, search completed, server started)
  - `warn` - Recoverable errors (unsupported files, parse failures, cache misses)
  - `error` - Unrecoverable errors (model loading failed, ChromaDB connection failed)
- **Recommendation**: Use `debug` for troubleshooting, `info` for normal operation
- **Example**: `info`

---

### Schema Version

#### `schemaVersion`

- **Type**: String
- **Default**: `1.0.0`
- **Description**: Schema version for data migration and compatibility checking. The system will warn you if stored data has a different schema version.
- **Warning**: **DO NOT MODIFY THIS VALUE**. It is managed by the system.
- **Example**: `1.0.0`

---

## Example Configurations

### Minimal Configuration

```json
{
  "logging": {
    "level": "info"
  }
}
```

All other settings will use defaults.

### Development Configuration

```json
{
  "server": {
    "port": 8009
  },
  "logging": {
    "level": "debug"
  },
  "search": {
    "cacheTimeoutSeconds": 0
  }
}
```

### Production Configuration

```json
{
  "chromadb": {
    "persistPath": "/var/lib/codebase-memory/chromadb"
  },
  "embedding": {
    "cachePath": "/var/lib/codebase-memory/models"
  },
  "server": {
    "port": 8008,
    "host": "localhost"
  },
  "ingestion": {
    "batchSize": 200,
    "maxFileSize": 2097152
  },
  "search": {
    "defaultMaxResults": 50,
    "cacheTimeoutSeconds": 120
  },
  "logging": {
    "level": "warn"
  }
}
```

### High-Performance Configuration

For systems with more RAM and processing power:

```json
{
  "embedding": {
    "modelName": "Xenova/all-MiniLM-L12-v2"
  },
  "ingestion": {
    "batchSize": 500,
    "maxFileSize": 5242880
  },
  "search": {
    "defaultMaxResults": 100,
    "cacheTimeoutSeconds": 300
  }
}
```

---

## Configuration Validation

The system validates all configuration values at startup. If an invalid value is provided:

1. An error message is logged with details about the invalid value
2. The system exits with a non-zero status code
3. No services are started

### Common Validation Errors

**Invalid port number:**
```
Error: Invalid configuration value for server.port: must be between 1024 and 65535
```

**Invalid log level:**
```
Error: Invalid configuration value for logging.level: must be one of: debug, info, warn, error
```

**Invalid path:**
```
Error: Invalid configuration value for chromadb.persistPath: directory does not exist and cannot be created
```

---

## Environment Variable Reference

Quick reference for all environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CHROMADB_PERSIST_PATH` | `~/.codebase-memory/chromadb` | ChromaDB data directory |
| `EMBEDDING_MODEL_NAME` | `Xenova/all-MiniLM-L6-v2` | Hugging Face model name |
| `EMBEDDING_CACHE_PATH` | `~/.codebase-memory/models` | Model cache directory |
| `SERVER_PORT` | `8008` | Manager UI port |
| `SERVER_HOST` | `localhost` | Manager UI host |
| `INGESTION_BATCH_SIZE` | `100` | Chunks per batch |
| `INGESTION_MAX_FILE_SIZE` | `1048576` | Max file size (bytes) |
| `SEARCH_DEFAULT_MAX_RESULTS` | `50` | Default max results |
| `SEARCH_CACHE_TIMEOUT_SECONDS` | `60` | Cache timeout (seconds) |
| `LOG_LEVEL` | `info` | Log level |
| `CONFIG_PATH` | - | Path to config.json (optional) |

---

## Troubleshooting

### Configuration Not Loading

**Problem**: Changes to configuration are not taking effect.

**Solutions**:
1. Verify the configuration file path: `~/.codebase-memory/config.json`
2. Check JSON syntax with `cat ~/.codebase-memory/config.json | jq`
3. Restart all services (MCP server, Manager UI)
4. Check logs for configuration errors

### Port Already in Use

**Problem**: `Error: Port 8008 is already in use`

**Solution**: Change the port in your configuration:
```json
{
  "server": {
    "port": 8009
  }
}
```

Or set environment variable:
```bash
SERVER_PORT=8009 manager
```

### Model Download Fails

**Problem**: Embedding model fails to download.

**Solutions**:
1. Check internet connectivity
2. Verify disk space in cache directory
3. Try a different model
4. Clear cache and retry: `rm -rf ~/.codebase-memory/models`

### Permission Errors

**Problem**: Cannot write to data directories.

**Solutions**:
1. Check directory permissions: `ls -la ~/.codebase-memory`
2. Create directories manually: `mkdir -p ~/.codebase-memory/{chromadb,models}`
3. Fix permissions: `chmod 755 ~/.codebase-memory`

---

## Best Practices

1. **Start with defaults**: Only customize settings you need to change
2. **Use environment variables for secrets**: Never commit sensitive data to config files
3. **Document custom settings**: Add comments in your `.env` file explaining why you changed defaults
4. **Test configuration changes**: Verify services start correctly after changes
5. **Back up configuration**: Keep a copy of your working configuration
6. **Monitor resource usage**: Adjust batch sizes and cache settings based on system performance
7. **Keep models consistent**: Don't change embedding models unless you re-ingest all codebases

---

## See Also

- [README.md](README.md) - Main documentation
- [.env.example](.env.example) - Example environment variables
- [config.example.json](config.example.json) - Example configuration file
