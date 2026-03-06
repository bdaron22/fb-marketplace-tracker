#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Copy .txt-suffixed source files to their proper names
# The repo stores files with .txt extensions to work around certain restrictions
find . -name "*.txt" \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -not -path "./dist/*" | while read -r file; do
    proper_name="${file%.txt}"
    if [ ! -f "$proper_name" ]; then
      cp "$file" "$proper_name"
      echo "Restored: $proper_name"
    fi
  done

# Install npm dependencies
npm install
