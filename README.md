# Ethora + Ollama

Run an Ethora AI agent on a model that never leaves your machine. The Ethora
`ai-service` talks to any OpenAI-compatible endpoint, and Ollama exposes one at
`/v1`, so the switch is four environment variables.

## What this repo is, and is not

- It contains the Ollama side: a compose file that runs Ollama and pulls the
  models, the four env vars for Ethora, and a script that verifies the calls.
- It does not contain the Ethora backend. A self-hosted Ethora server is
  installed with the enterprise installer (source access is available on request
  at https://ethora.com). The ai-service reads the env file below.

## Prerequisites

- A self-hosted Ethora install with `features.ai_service: true`
  (installer: `ethora-monoserver/deploy`, Ubuntu 20.04 or 22.04, 4 GB RAM minimum).
- Docker with Compose v2 on the same host (or the Ollama binary).
- The ai-service needs a Postgres with pgvector for RAG. This repo's compose
  file starts one and creates the `documents` table (`db/001_documents.sql`).
  The Ethora installer does not start it, and without the table every RAG-enabled
  agent fails on its first message.
- About 2 GB free disk for the default chat model, plus about 0.3 GB for embeddings.

## Which models to pull

| Role | Model | Size on disk | Why |
| --- | --- | --- | --- |
| Chat | `qwen2.5:3b-instruct` | about 1.9 GB | Runs on CPU, answers in under a second when warm |
| Embeddings | `nomic-embed-text` | about 0.3 GB | Honours `dimensions: 256`, which matches the `vector(256)` column |

Swap the chat model by changing `AI_CHAT_MODEL`. Larger models answer better and
need more RAM.

## Start

```sh
docker compose up -d
```

This starts Ollama on `127.0.0.1:11434`, a pgvector database on `127.0.0.1:5432`
with the schema applied, and pulls both models once.

## Point Ethora at it

Copy the lines from `.env.example` into `ethora-backend/services/ai/ai-service/.env`,
then restart the ai-service process. The deploy template only renders
`OPENAI_API_KEY`, so these four lines are added by hand.

## Verify

```sh
sh scripts/verify.sh
```

Expected: HTTP 200 for the chat call and `dims: 256` for embeddings.

To test the whole chain (message, ejabberd, ai-service, RAG, Ollama, reply),
start the agent in the Ethora admin (AI Widget tab, `start`), then:

```sh
npm i @xmpp/client
ROOM=<appId>_<chatId>@conference.<domain> node scripts/chat-test.js "What is a chat SDK?"
```

## Measured end to end (4 vCPU, 8 GB RAM Linux VM, CPU only, Ollama 0.40.1, `qwen2.5:3b-instruct`)

Message sent over XMPP to the agent's room, RAG on with an empty knowledge base:

- First reply after the agent starts: 32.7 s
- Next replies: 6.1 s and 8.1 s (short answers of one or two sentences)
- Ethora stack idle (all services, before Ollama): about 2.3 GB of RAM

## Measured model calls only (Apple M-series, 16 GB, Ollama 0.40.1, `qwen2.5:3b-instruct`)

- First call (model load): 1.97 s
- Warm calls: 0.37 s to 0.38 s for a 21 token answer
- Embeddings with `dimensions: 256`: 256 values returned; default is 768

## Limitations

- The ai-service sends `dimensions: 256` on every embedding call. A model that
  ignores that parameter would return the wrong size and break inserts.
- With no knowledge base, the 3B model answered "What is Ethora?" with a
  description of a cryptocurrency exchange. Add a persona and crawl your site
  into the RAG store before putting it in front of users.
- Small local models follow instructions less reliably than hosted frontier models.
  Asked "what is Ethora?" with no context, `qwen2.5:3b-instruct` answered that it
  is a text-to-image model. Ground the agent with a persona and the RAG
  knowledge base, otherwise it will invent answers.
- The model setting is service-wide. A per-agent model name exists, but not a
  per-agent endpoint.
- Not covered here: GPU setup, multi-user load. No throughput figures are claimed.
