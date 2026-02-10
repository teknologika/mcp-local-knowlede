#!/bin/bash
# Start ChromaDB locally with npx

echo "Starting ChromaDB server locally..."
echo ""
echo "This will run: npx chroma run --path ./.codebase-memory/chromadb"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npx chroma run --path ./.codebase-memory/chromadb
