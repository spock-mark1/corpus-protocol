-- Add missing columns to cpp_corpus that were defined in schema but never migrated
ALTER TABLE "cpp_corpus" ADD COLUMN "onChainId" integer UNIQUE;
ALTER TABLE "cpp_corpus" ADD COLUMN "agentName" text UNIQUE;
ALTER TABLE "cpp_corpus" ADD COLUMN "investorAddress" text;
ALTER TABLE "cpp_corpus" ADD COLUMN "treasuryAddress" text;
ALTER TABLE "cpp_corpus" ADD COLUMN "agentWalletId" text;
ALTER TABLE "cpp_corpus" ADD COLUMN "agentWalletAddress" text;

-- Also add missing columns in other tables
ALTER TABLE "cpp_commerce_services" ADD COLUMN IF NOT EXISTS "fulfillmentMode" text NOT NULL DEFAULT 'async';
ALTER TABLE "cpp_playbooks" ADD COLUMN IF NOT EXISTS "content" jsonb;
ALTER TABLE "cpp_commerce_jobs" ADD COLUMN IF NOT EXISTS "txHash" text;
