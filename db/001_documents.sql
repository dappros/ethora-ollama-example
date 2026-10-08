CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"appId" text NOT NULL,
	"url" text,
	"origin_url" text,
	"content" text NOT NULL,
	"embedding" vector(256),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "embedding_index" ON "documents" USING hnsw ("embedding" vector_cosine_ops);
