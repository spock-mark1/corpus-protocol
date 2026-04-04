import { createId } from "@paralleldrive/cuid2";
import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Corpus (Agent Corporation) ───────────────────────────────────

export const cppCorpus = pgTable(
  "cpp_corpus",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    onChainId: integer("onChainId").unique(),    // Smart contract corpus ID
    agentName: text("agentName").unique(),        // Prime Agent identity (e.g. "marketbot" → marketbot.corpus)
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("Active"),

    // Pulse Token
    hederaTokenId: text("hederaTokenId"),
    pulsePrice: numeric("pulsePrice", { precision: 18, scale: 6 }).notNull().default("0"),
    totalSupply: integer("totalSupply").notNull().default(1000000),

    // Patron Equity Structure
    creatorShare: integer("creatorShare").notNull().default(60),
    investorShare: integer("investorShare").notNull().default(25),
    treasuryShare: integer("treasuryShare").notNull().default(15),

    // Local Agent Auth
    apiKey: text("apiKey").unique(),

    // Prime Agent Config
    persona: text("persona"),
    targetAudience: text("targetAudience"),
    channels: text("channels").array().notNull().default([]),
    toneVoice: text("toneVoice"),

    // Kernel Policy
    approvalThreshold: numeric("approvalThreshold", { precision: 18, scale: 2 }).notNull().default("10"),
    gtmBudget: numeric("gtmBudget", { precision: 18, scale: 2 }).notNull().default("200"),
    minPatronPulse: integer("minPatronPulse"),

    // Agent Status
    agentOnline: boolean("agentOnline").notNull().default(false),
    agentLastSeen: timestamp("agentLastSeen", { mode: "date", precision: 3 }),

    // Wallet
    walletAddress: text("walletAddress"),
    creatorAddress: text("creatorAddress"),
    investorAddress: text("investorAddress"),
    treasuryAddress: text("treasuryAddress"),

    // Circle Agent Wallet (MPC — for x402 payments on Arc)
    agentWalletId: text("agentWalletId"),         // Circle wallet ID (for signing API calls)
    agentWalletAddress: text("agentWalletAddress"), // EVM address on Arc

    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull().$onUpdate(() => new Date()),
  },
);

// ─── Patron (Shareholder) ─────────────────────────────────────────

export const cppPatrons = pgTable(
  "cpp_patrons",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    corpusId: text("corpusId").notNull().references(() => cppCorpus.id, { onDelete: "cascade" }),
    walletAddress: text("walletAddress").notNull(),
    role: text("role").notNull(),
    pulseAmount: integer("pulseAmount").notNull().default(0),
    share: numeric("share", { precision: 5, scale: 2 }).notNull(),
    status: text("status").notNull().default("active"),

    worldIdHash: text("worldIdHash"),

    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("cpp_patrons_corpusId_walletAddress_key").on(t.corpusId, t.walletAddress),
  ],
);

// ─── Activity Log ─────────────────────────────────────────────────

export const cppActivities = pgTable(
  "cpp_activities",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    corpusId: text("corpusId").notNull().references(() => cppCorpus.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    content: text("content").notNull(),
    channel: text("channel").notNull(),
    status: text("status").notNull().default("completed"),

    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    index("cpp_activities_corpusId_createdAt_idx").on(t.corpusId, t.createdAt),
  ],
);

// ─── Approval Request ─────────────────────────────────────────────

export const cppApprovals = pgTable(
  "cpp_approvals",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    corpusId: text("corpusId").notNull().references(() => cppCorpus.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 18, scale: 6 }),
    status: text("status").notNull().default("pending"),

    decidedAt: timestamp("decidedAt", { mode: "date", precision: 3 }),
    decidedBy: text("decidedBy"),

    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull().$onUpdate(() => new Date()),
  },
  (t) => [
    index("cpp_approvals_corpusId_status_idx").on(t.corpusId, t.status),
  ],
);

// ─── Revenue ──────────────────────────────────────────────────────

export const cppRevenues = pgTable(
  "cpp_revenues",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    corpusId: text("corpusId").notNull().references(() => cppCorpus.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
    currency: text("currency").notNull().default("USDC"),
    source: text("source").notNull(),
    txHash: text("txHash"),

    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    index("cpp_revenues_corpusId_createdAt_idx").on(t.corpusId, t.createdAt),
  ],
);

// ─── Commerce Service (Storefront) ────────────────────────────────

export const cppCommerceServices = pgTable(
  "cpp_commerce_services",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    corpusId: text("corpusId").notNull().unique().references(() => cppCorpus.id, { onDelete: "cascade" }),
    serviceName: text("serviceName").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 18, scale: 6 }).notNull(),
    currency: text("currency").notNull().default("USDC"),
    walletAddress: text("walletAddress").notNull(),
    chains: text("chains").array().notNull().default(["arc"]),

    // "instant" = server fulfills immediately via external API, "async" = agent polls & fulfills
    fulfillmentMode: text("fulfillmentMode").notNull().default("async"),

    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull().$onUpdate(() => new Date()),
  },
);

// ─── Commerce Job (x402 Job Queue) ────────────────────────────────

export const cppCommerceJobs = pgTable(
  "cpp_commerce_jobs",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    corpusId: text("corpusId").notNull().references(() => cppCorpus.id, { onDelete: "cascade" }),
    requesterCorpusId: text("requesterCorpusId").notNull(),
    serviceName: text("serviceName").notNull(),
    payload: jsonb("payload"),
    result: jsonb("result"),
    status: text("status").notNull().default("pending"),
    paymentSig: text("paymentSig"),
    txHash: text("txHash"),
    amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),

    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull().$onUpdate(() => new Date()),
  },
  (t) => [
    index("cpp_commerce_jobs_corpusId_status_idx").on(t.corpusId, t.status),
  ],
);

// ─── Playbook (Agent Knowledge Package) ───────────────────────────

export const cppPlaybooks = pgTable(
  "cpp_playbooks",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    corpusId: text("corpusId").notNull().references(() => cppCorpus.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    channel: text("channel").notNull(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 18, scale: 6 }).notNull(),
    currency: text("currency").notNull().default("USDC"),
    version: integer("version").notNull().default(1),
    tags: text("tags").array().notNull().default([]),
    status: text("status").notNull().default("active"),

    // Playbook content — PRD structure: schedule, templates, hashtags, tactics
    content: jsonb("content"),

    // Verified metrics
    impressions: integer("impressions").notNull().default(0),
    engagementRate: numeric("engagementRate", { precision: 5, scale: 2 }).notNull().default("0"),
    conversions: integer("conversions").notNull().default(0),
    periodDays: integer("periodDays").notNull().default(30),

    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull().$onUpdate(() => new Date()),
  },
  (t) => [
    index("cpp_playbooks_corpusId_idx").on(t.corpusId),
  ],
);

// ─── Playbook Purchase ────────────────────────────────────────────

export const cppPlaybookPurchases = pgTable(
  "cpp_playbook_purchases",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    playbookId: text("playbookId").notNull().references(() => cppPlaybooks.id, { onDelete: "cascade" }),
    buyerAddress: text("buyerAddress").notNull(),
    appliedAt: timestamp("appliedAt", { mode: "date", precision: 3 }),
    txHash: text("txHash"),

    createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("cpp_playbook_purchases_playbookId_buyerAddress_key").on(t.playbookId, t.buyerAddress),
  ],
);
