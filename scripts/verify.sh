#!/usr/bin/env sh
# Checks that Ollama answers the exact OpenAI-compatible calls the Ethora ai-service makes.
set -eu

URL="${AI_API_URL:-http://localhost:11434/v1}"
CHAT="${AI_CHAT_MODEL:-qwen2.5:3b-instruct}"
EMB="${AI_EMBEDDING_MODEL:-nomic-embed-text}"

echo "== chat completion ($CHAT)"
curl -sS -w "\nhttp=%{http_code} total=%{time_total}s\n" "$URL/chat/completions" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer ollama' \
  -d "{\"model\":\"$CHAT\",\"messages\":[{\"role\":\"user\",\"content\":\"In one sentence, what is Ethora?\"}],\"max_completion_tokens\":120,\"temperature\":0.2}"

echo "== embeddings ($EMB, dimensions=256)"
curl -sS "$URL/embeddings" -H 'Content-Type: application/json' \
  -d "{\"model\":\"$EMB\",\"input\":\"hello\",\"dimensions\":256}" |
  python3 -c "import sys,json; print('dims:', len(json.load(sys.stdin)['data'][0]['embedding']))"
