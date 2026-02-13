#!/bin/bash

# Mandatory renames for codebase → knowledgebase
# This script performs ONLY the mandatory changes

set -e

echo "🔄 Starting mandatory renames..."

# Backup function
backup_file() {
    if [ -f "$1" ]; then
        cp "$1" "$1.backup"
    fi
}

# Replace function that works on macOS and Linux
safe_replace() {
    local file=$1
    local pattern=$2
    local replacement=$3
    
    if [ -f "$file" ]; then
        # Create backup
        cp "$file" "$file.tmp"
        
        # Perform replacement
        sed "s|$pattern|$replacement|g" "$file.tmp" > "$file"
        
        # Remove temp file
        rm "$file.tmp"
    fi
}

# Find and replace in all matching files
find_and_replace() {
    local pattern=$1
    local replacement=$2
    local file_pattern=$3
    
    echo "  📝 Replacing '$pattern' → '$replacement' in $file_pattern files..."
    
    find . -type f -name "$file_pattern" \
        ! -path "*/node_modules/*" \
        ! -path "*/dist/*" \
        ! -path "*/.git/*" \
        ! -path "*/scripts/*" \
        -print0 | while IFS= read -r -d '' file; do
        safe_replace "$file" "$pattern" "$replacement"
    done
}

# 1. API Endpoints: /api/codebases → /api/knowledgebases
echo "📡 1. Updating API endpoints..."
find_and_replace "/api/codebases" "/api/knowledgebases" "*.ts"
find_and_replace "/api/codebases" "/api/knowledgebases" "*.js"
find_and_replace "/api/codebases" "/api/knowledgebases" "*.hbs"
find_and_replace "/api/codebases" "/api/knowledgebases" "*.html"
find_and_replace "/api/codebases" "/api/knowledgebases" "*.md"

# 2. Table Prefixes: codebase_ → knowledgebase_
echo "🗄️  2. Updating table prefixes..."
find_and_replace "codebase_" "knowledgebase_" "*.ts"
find_and_replace "codebase_" "knowledgebase_" "*.js"

# 3. Config Paths: .codebase-memory → .knowledge-base
echo "⚙️  3. Updating config paths..."
find_and_replace "\\.codebase-memory" ".knowledge-base" "*.json"
find_and_replace "\\.codebase-memory" ".knowledge-base" "*.ts"
find_and_replace "\\.codebase-memory" ".knowledge-base" "*.js"
find_and_replace "\\.codebase-memory" ".knowledge-base" "*.md"
find_and_replace "~/.codebase-memory" "~/.knowledge-base" "*.json"

# 4. UI Text: "Codebase" → "Knowledge Base" (in user-facing strings)
echo "🎨 4. Updating UI text..."
find_and_replace "Codebase Memory Manager" "Knowledge Base Manager" "*.html"
find_and_replace "Codebase Memory Manager" "Knowledge Base Manager" "*.hbs"
find_and_replace "Codebase Memory Manager" "Knowledge Base Manager" "*.js"
find_and_replace "Codebase Manager" "Knowledge Base Manager" "*.html"
find_and_replace "Codebase Manager" "Knowledge Base Manager" "*.hbs"
find_and_replace "Codebase Manager" "Knowledge Base Manager" "*.js"
find_and_replace "Rename Codebase" "Rename Knowledge Base" "*.html"
find_and_replace "Delete Codebase" "Delete Knowledge Base" "*.html"
find_and_replace "Codebases" "Knowledge Bases" "*.html"
find_and_replace "Codebases" "Knowledge Bases" "*.hbs"
find_and_replace "codebase to view" "knowledge base to view" "*.html"
find_and_replace "codebase name" "knowledge base name" "*.html"
find_and_replace "indexed codebases" "indexed knowledge bases" "*.html"
find_and_replace "indexed codebases" "indexed knowledge bases" "*.js"
find_and_replace "this codebase" "this knowledge base" "*.js"

# 5. localStorage: codebase-theme → knowledgebase-theme
echo "💾 5. Updating localStorage keys..."
find_and_replace "codebase-theme" "knowledgebase-theme" "*.js"
find_and_replace "codebase-memory-test" "knowledge-base-test" "*.ts"

# 6. MCP Tools
echo "🔧 6. Updating MCP tool names..."
find_and_replace "list_codebases" "list_knowledgebases" "*.md"
find_and_replace "list_codebases" "list_knowledgebases" "*.ts"
find_and_replace "search_codebases" "search_knowledgebases" "*.md"
find_and_replace "search_codebases" "search_knowledgebases" "*.ts"
find_and_replace "get_codebase_stats" "get_knowledgebase_stats" "*.md"
find_and_replace "get_codebase_stats" "get_knowledgebase_stats" "*.ts"
find_and_replace "open_codebase_manager" "open_knowledgebase_manager" "*.md"
find_and_replace "open_codebase_manager" "open_knowledgebase_manager" "*.ts"

# 7. Route paths in templates
echo "🛣️  7. Updating route paths..."
find_and_replace "/codebase/" "/knowledgebase/" "*.hbs"
find_and_replace "/codebase/" "/knowledgebase/" "*.html"

# 8. Comments about codebases
echo "📚 8. Updating comments..."
find_and_replace "codebase tables" "knowledge base tables" "*.ts"
find_and_replace "indexed codebases" "indexed knowledge bases" "*.md"
find_and_replace "indexed codebases" "indexed knowledge bases" "*.ts"
find_and_replace "all codebases" "all knowledge bases" "*.ts"
find_and_replace "all codebases" "all knowledge bases" "*.md"

echo ""
echo "✅ Mandatory renames complete!"
echo ""
echo "⚠️  Next steps:"
echo "   1. Review changes: git diff"
echo "   2. Rebuild: npm run build"
echo "   3. Run tests: npm test"
echo "   4. If everything works, commit the changes"
echo ""
