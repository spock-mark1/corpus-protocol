import { relations } from "drizzle-orm/relations";
import { cppCorpus, cppPatrons, cppActivities, cppCommerceJobs, cppCommerceServices, cppApprovals, cppRevenues, cppPlaybooks, cppPlaybookPurchases } from "./schema";

export const cppPatronsRelations = relations(cppPatrons, ({one}) => ({
	cppCorpus: one(cppCorpus, {
		fields: [cppPatrons.corpusId],
		references: [cppCorpus.id]
	}),
}));

export const cppCorpusRelations = relations(cppCorpus, ({many}) => ({
	cppPatrons: many(cppPatrons),
	cppActivities: many(cppActivities),
	cppCommerceJobs: many(cppCommerceJobs),
	cppCommerceServices: many(cppCommerceServices),
	cppApprovals: many(cppApprovals),
	cppRevenues: many(cppRevenues),
	cppPlaybooks: many(cppPlaybooks),
}));

export const cppActivitiesRelations = relations(cppActivities, ({one}) => ({
	cppCorpus: one(cppCorpus, {
		fields: [cppActivities.corpusId],
		references: [cppCorpus.id]
	}),
}));

export const cppCommerceJobsRelations = relations(cppCommerceJobs, ({one}) => ({
	cppCorpus: one(cppCorpus, {
		fields: [cppCommerceJobs.corpusId],
		references: [cppCorpus.id]
	}),
}));

export const cppCommerceServicesRelations = relations(cppCommerceServices, ({one}) => ({
	cppCorpus: one(cppCorpus, {
		fields: [cppCommerceServices.corpusId],
		references: [cppCorpus.id]
	}),
}));

export const cppApprovalsRelations = relations(cppApprovals, ({one}) => ({
	cppCorpus: one(cppCorpus, {
		fields: [cppApprovals.corpusId],
		references: [cppCorpus.id]
	}),
}));

export const cppRevenuesRelations = relations(cppRevenues, ({one}) => ({
	cppCorpus: one(cppCorpus, {
		fields: [cppRevenues.corpusId],
		references: [cppCorpus.id]
	}),
}));

export const cppPlaybooksRelations = relations(cppPlaybooks, ({one, many}) => ({
	cppCorpus: one(cppCorpus, {
		fields: [cppPlaybooks.corpusId],
		references: [cppCorpus.id]
	}),
	cppPlaybookPurchases: many(cppPlaybookPurchases),
}));

export const cppPlaybookPurchasesRelations = relations(cppPlaybookPurchases, ({one}) => ({
	cppPlaybook: one(cppPlaybooks, {
		fields: [cppPlaybookPurchases.playbookId],
		references: [cppPlaybooks.id]
	}),
}));