import { pgTable, uniqueIndex, text, integer, numeric, boolean, timestamp, foreignKey, index, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const cppCorpus = pgTable("cpp_corpus", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	description: text().notNull(),
	status: text().default('Active').notNull(),
	hederaTokenId: text(),
	totalSupply: integer().default(1000000).notNull(),
	creatorShare: integer().default(60).notNull(),
	investorShare: integer().default(25).notNull(),
	treasuryShare: integer().default(15).notNull(),
	apiEndpoint: text(),
	apiKey: text(),
	persona: text(),
	targetAudience: text(),
	channels: text().array().default(["RAY"]),
	toneVoice: text(),
	approvalThreshold: numeric({ precision: 18, scale:  2 }).default('10').notNull(),
	gtmBudget: numeric({ precision: 18, scale:  2 }).default('200').notNull(),
	agentOnline: boolean().default(false).notNull(),
	agentLastSeen: timestamp({ precision: 3, mode: 'string' }),
	walletAddress: text(),
	creatorAddress: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	pulsePrice: numeric({ precision: 18, scale:  6 }).default('0').notNull(),
	minPatronPulse: integer(),
}, (table) => [
	uniqueIndex("cpp_corpus_apiKey_key").using("btree", table.apiKey.asc().nullsLast().op("text_ops")),
]);

export const cppPatrons = pgTable("cpp_patrons", {
	id: text().primaryKey().notNull(),
	corpusId: text().notNull(),
	walletAddress: text().notNull(),
	role: text().notNull(),
	share: numeric({ precision: 5, scale:  2 }).notNull(),
	worldIdHash: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	pulseAmount: integer().default(0).notNull(),
	status: text().default('active').notNull(),
}, (table) => [
	uniqueIndex("cpp_patrons_corpusId_walletAddress_key").using("btree", table.corpusId.asc().nullsLast().op("text_ops"), table.walletAddress.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.corpusId],
			foreignColumns: [cppCorpus.id],
			name: "cpp_patrons_corpusId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cppActivities = pgTable("cpp_activities", {
	id: text().primaryKey().notNull(),
	corpusId: text().notNull(),
	type: text().notNull(),
	content: text().notNull(),
	channel: text().notNull(),
	status: text().default('completed').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("cpp_activities_corpusId_createdAt_idx").using("btree", table.corpusId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.corpusId],
			foreignColumns: [cppCorpus.id],
			name: "cpp_activities_corpusId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cppCommerceJobs = pgTable("cpp_commerce_jobs", {
	id: text().primaryKey().notNull(),
	corpusId: text().notNull(),
	requesterCorpusId: text().notNull(),
	serviceName: text().notNull(),
	payload: jsonb(),
	result: jsonb(),
	status: text().default('pending').notNull(),
	paymentSig: text(),
	amount: numeric({ precision: 18, scale:  6 }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("cpp_commerce_jobs_corpusId_status_idx").using("btree", table.corpusId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.corpusId],
			foreignColumns: [cppCorpus.id],
			name: "cpp_commerce_jobs_corpusId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cppCommerceServices = pgTable("cpp_commerce_services", {
	id: text().primaryKey().notNull(),
	corpusId: text().notNull(),
	serviceName: text().notNull(),
	description: text(),
	price: numeric({ precision: 18, scale:  6 }).notNull(),
	currency: text().default('USDC').notNull(),
	walletAddress: text().notNull(),
	chains: text().array().default(["RAY['hedera'::tex"]),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("cpp_commerce_services_corpusId_key").using("btree", table.corpusId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.corpusId],
			foreignColumns: [cppCorpus.id],
			name: "cpp_commerce_services_corpusId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cppApprovals = pgTable("cpp_approvals", {
	id: text().primaryKey().notNull(),
	corpusId: text().notNull(),
	type: text().notNull(),
	title: text().notNull(),
	description: text(),
	amount: numeric({ precision: 18, scale:  6 }),
	status: text().default('pending').notNull(),
	decidedAt: timestamp({ precision: 3, mode: 'string' }),
	decidedBy: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("cpp_approvals_corpusId_status_idx").using("btree", table.corpusId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.corpusId],
			foreignColumns: [cppCorpus.id],
			name: "cpp_approvals_corpusId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cppRevenues = pgTable("cpp_revenues", {
	id: text().primaryKey().notNull(),
	corpusId: text().notNull(),
	amount: numeric({ precision: 18, scale:  6 }).notNull(),
	currency: text().default('USDC').notNull(),
	source: text().notNull(),
	txHash: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("cpp_revenues_corpusId_createdAt_idx").using("btree", table.corpusId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.corpusId],
			foreignColumns: [cppCorpus.id],
			name: "cpp_revenues_corpusId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cppPlaybooks = pgTable("cpp_playbooks", {
	id: text().primaryKey().notNull(),
	corpusId: text().notNull(),
	title: text().notNull(),
	category: text().notNull(),
	channel: text().notNull(),
	description: text().notNull(),
	price: numeric({ precision: 18, scale:  6 }).notNull(),
	currency: text().default('USDC').notNull(),
	version: integer().default(1).notNull(),
	tags: text().array().default(["RAY"]),
	status: text().default('active').notNull(),
	impressions: integer().default(0).notNull(),
	engagementRate: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	conversions: integer().default(0).notNull(),
	periodDays: integer().default(30).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("cpp_playbooks_corpusId_idx").using("btree", table.corpusId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.corpusId],
			foreignColumns: [cppCorpus.id],
			name: "cpp_playbooks_corpusId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cppPlaybookPurchases = pgTable("cpp_playbook_purchases", {
	id: text().primaryKey().notNull(),
	playbookId: text().notNull(),
	buyerAddress: text().notNull(),
	appliedAt: timestamp({ precision: 3, mode: 'string' }),
	txHash: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("cpp_playbook_purchases_playbookId_buyerAddress_key").using("btree", table.playbookId.asc().nullsLast().op("text_ops"), table.buyerAddress.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.playbookId],
			foreignColumns: [cppPlaybooks.id],
			name: "cpp_playbook_purchases_playbookId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);
