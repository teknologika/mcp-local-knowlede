#!/bin/bash
# Test script to run MCP server and see full output

echo "Testing MCP server startup..."
echo "================================"
echo ""

# Run the server with a timeout
echo "Starting mcp-codebase-search..."
echo ""

# Use gtimeout if available (brew install coreutils), otherwise just run it
if command -v gtimeout &> /dev/null; then
    gtimeout 5 mcp-codebase-search 2>&1
    EXIT_CODE=$?
    echo ""
    echo "Exit code: $EXIT_CODE"
else
    # Just run it for a bit and kill it
    mcp-codebase-search 2>&1 &
    PID=$!
    sleep 3
    kill $PID 2>/dev/null
    echo ""
    echo "Server PID was: $PID"
fi

echo ""
echo "================================"
echo "Test complete"
