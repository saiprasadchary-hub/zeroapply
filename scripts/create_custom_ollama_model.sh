#!/usr/bin/env bash
set -e

echo "============================================================"
echo "🚀 Building ZeroApply Neural Core Model in Ollama"
echo "============================================================"

# Resolve Ollama executable
OLLAMA_CMD="ollama"
if ! command -v ollama &> /dev/null; then
  if [ -x "/opt/homebrew/bin/ollama" ]; then
    OLLAMA_CMD="/opt/homebrew/bin/ollama"
  elif [ -x "/usr/local/bin/ollama" ]; then
    OLLAMA_CMD="/usr/local/bin/ollama"
  else
    echo "❌ Ollama executable not found. Please install Ollama or ensure it is in PATH."
    exit 1
  fi
fi

# Ensure base model qwen2.5:3b is pulled
echo "📥 Verifying base foundation model (qwen2.5:3b)..."
$OLLAMA_CMD pull qwen2.5:3b

# Resolve workspace directory and Modelfile
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELFILE_PATH="$WORKSPACE_DIR/Modelfile.zeroapply"

if [ ! -f "$MODELFILE_PATH" ]; then
  echo "❌ Error: Modelfile not found at $MODELFILE_PATH"
  exit 1
fi

echo "🧠 Compiling specialized 'zeroapply' model from $MODELFILE_PATH..."
$OLLAMA_CMD create zeroapply -f "$MODELFILE_PATH"

echo "============================================================"
echo "✅ SUCCESS! 'zeroapply' model is now active in local Ollama!"
echo "============================================================"
$OLLAMA_CMD list | grep -E "NAME|zeroapply"
