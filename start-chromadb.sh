#!/bin/bash
# Start ChromaDB server with Docker

echo "Starting ChromaDB server..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

# Stop any existing ChromaDB container
docker stop chromadb 2>/dev/null || true
docker rm chromadb 2>/dev/null || true

# Start ChromaDB with persistent storage
echo "Starting ChromaDB container..."
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v "$HOME/.codebase-memory/chromadb:/chroma/chroma" \
  chromadb/chroma:latest

echo ""
echo "Waiting for ChromaDB to be ready..."
sleep 3

# Test if it's responding
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo "✓ ChromaDB is running at http://localhost:8000"
    echo ""
    echo "To stop: docker stop chromadb"
    echo "To view logs: docker logs chromadb"
else
    echo "✗ ChromaDB failed to start"
    echo "Check logs with: docker logs chromadb"
    exit 1
fi
