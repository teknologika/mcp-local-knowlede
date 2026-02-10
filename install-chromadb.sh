#!/bin/bash
# Install and start ChromaDB server

echo "Installing ChromaDB..."
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    echo "Install with: brew install python3"
    exit 1
fi

# Install ChromaDB
echo "Installing chromadb package..."
pip3 install chromadb

echo ""
echo "Starting ChromaDB server..."
echo ""

# Create directory if it doesn't exist
mkdir -p .codebase-memory/chromadb

# Start ChromaDB
chroma run --path ./.codebase-memory/chromadb
