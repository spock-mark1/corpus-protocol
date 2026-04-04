-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "cpp_corpus" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"hederaTokenId" text,
	"totalSupply" integer DEFAULT 1000000 NOT NULL,
	"creatorShare" integer DEFAULT 60 NOT NULL,
	"investorShare" integer DEFAULT 25 NOT NULL,
	"treasuryShare" integer DEFAULT 15 NOT NULL,
	"apiEndpoint" text,
	"apiKey" text,
	"persona" text,
	"targetAudience" text,
	"channels" text[] DEFAULT '{"RAY"}',
	"toneVoice" text,
	"approvalThreshold" numeric(18, 2) DEFAULT '10' NOT NULL,
	"gtmBudget" numeric(18, 2) DEFAULT '200' NOT NULL,
	"agentOnline" boolean DEFAULT false NOT NULL,
	"agentLastSeen" timestamp(3),
	"walletAddress" text,
	"creatorAddress" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"pulsePrice" numeric(18, 6) DEFAULT '0' NOT NULL,
	"minPatronPulse" integer
);
--> statement-breakpoint
ALTER TABLE "cpp_corpus" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cpp_patrons" (
	"id" text PRIMARY KEY NOT NULL,
	"corpusId" text NOT NULL,
	"walletAddress" text NOT NULL,
	"role" text NOT NULL,
	"share" numeric(5, 2) NOT NULL,
	"worldIdHash" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"pulseAmount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cpp_patrons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cpp_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"corpusId" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cpp_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cpp_commerce_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"corpusId" text NOT NULL,
	"requesterCorpusId" text NOT NULL,
	"serviceName" text NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"paymentSig" text,
	"amount" numeric(18, 6) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cpp_commerce_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cpp_commerce_services" (
	"id" text PRIMARY KEY NOT NULL,
	"corpusId" text NOT NULL,
	"serviceName" text NOT NULL,
	"description" text,
	"price" numeric(18, 6) NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"walletAddress" text NOT NULL,
	"chains" text[] DEFAULT '{"RAY['hedera'::tex"}',
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cpp_commerce_services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cpp_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"corpusId" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount" numeric(18, 6),
	"status" text DEFAULT 'pending' NOT NULL,
	"decidedAt" timestamp(3),
	"decidedBy" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cpp_approvals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cpp_revenues" (
	"id" text PRIMARY KEY NOT NULL,
	"corpusId" text NOT NULL,
	"amount" numeric(18, 6) NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"source" text NOT NULL,
	"txHash" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cpp_revenues" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cpp_playbooks" (
	"id" text PRIMARY KEY NOT NULL,
	"corpusId" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"channel" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"tags" text[] DEFAULT '{"RAY"}',
	"status" text DEFAULT 'active' NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"engagementRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"periodDays" integer DEFAULT 30 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cpp_playbook_purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"playbookId" text NOT NULL,
	"buyerAddress" text NOT NULL,
	"appliedAt" timestamp(3),
	"txHash" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cpp_patrons" ADD CONSTRAINT "cpp_patrons_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "public"."cpp_corpus"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpp_activities" ADD CONSTRAINT "cpp_activities_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "public"."cpp_corpus"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpp_commerce_jobs" ADD CONSTRAINT "cpp_commerce_jobs_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "public"."cpp_corpus"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpp_commerce_services" ADD CONSTRAINT "cpp_commerce_services_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "public"."cpp_corpus"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpp_approvals" ADD CONSTRAINT "cpp_approvals_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "public"."cpp_corpus"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpp_revenues" ADD CONSTRAINT "cpp_revenues_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "public"."cpp_corpus"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpp_playbooks" ADD CONSTRAINT "cpp_playbooks_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "public"."cpp_corpus"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpp_playbook_purchases" ADD CONSTRAINT "cpp_playbook_purchases_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "public"."cpp_playbooks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "cpp_corpus_apiKey_key" ON "cpp_corpus" USING btree ("apiKey" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "cpp_patrons_corpusId_walletAddress_key" ON "cpp_patrons" USING btree ("corpusId" text_ops,"walletAddress" text_ops);--> statement-breakpoint
CREATE INDEX "cpp_activities_corpusId_createdAt_idx" ON "cpp_activities" USING btree ("corpusId" text_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "cpp_commerce_jobs_corpusId_status_idx" ON "cpp_commerce_jobs" USING btree ("corpusId" text_ops,"status" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "cpp_commerce_services_corpusId_key" ON "cpp_commerce_services" USING btree ("corpusId" text_ops);--> statement-breakpoint
CREATE INDEX "cpp_approvals_corpusId_status_idx" ON "cpp_approvals" USING btree ("corpusId" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "cpp_revenues_corpusId_createdAt_idx" ON "cpp_revenues" USING btree ("corpusId" text_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "cpp_playbooks_corpusId_idx" ON "cpp_playbooks" USING btree ("corpusId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "cpp_playbook_purchases_playbookId_buyerAddress_key" ON "cpp_playbook_purchases" USING btree ("playbookId" text_ops,"buyerAddress" text_ops);
*/