import { relations } from "drizzle-orm";
import {
  cppCorpus,
  cppPatrons,
  cppActivities,
  cppApprovals,
  cppRevenues,
  cppCommerceServices,
  cppCommerceJobs,
  cppPlaybooks,
  cppPlaybookPurchases,
} from "./schema";

export const corpusRelations = relations(cppCorpus, ({ many, one }) => ({
  patrons: many(cppPatrons),
  activities: many(cppActivities),
  approvals: many(cppApprovals),
  revenues: many(cppRevenues),
  commerceServices: one(cppCommerceServices),
  commerceJobs: many(cppCommerceJobs),
  playbooks: many(cppPlaybooks),
}));

export const patronRelations = relations(cppPatrons, ({ one }) => ({
  corpus: one(cppCorpus, { fields: [cppPatrons.corpusId], references: [cppCorpus.id] }),
}));

export const activityRelations = relations(cppActivities, ({ one }) => ({
  corpus: one(cppCorpus, { fields: [cppActivities.corpusId], references: [cppCorpus.id] }),
}));

export const approvalRelations = relations(cppApprovals, ({ one }) => ({
  corpus: one(cppCorpus, { fields: [cppApprovals.corpusId], references: [cppCorpus.id] }),
}));

export const revenueRelations = relations(cppRevenues, ({ one }) => ({
  corpus: one(cppCorpus, { fields: [cppRevenues.corpusId], references: [cppCorpus.id] }),
}));

export const commerceServiceRelations = relations(cppCommerceServices, ({ one }) => ({
  corpus: one(cppCorpus, { fields: [cppCommerceServices.corpusId], references: [cppCorpus.id] }),
}));

export const commerceJobRelations = relations(cppCommerceJobs, ({ one }) => ({
  corpus: one(cppCorpus, { fields: [cppCommerceJobs.corpusId], references: [cppCorpus.id] }),
}));

export const playbookRelations = relations(cppPlaybooks, ({ one, many }) => ({
  corpus: one(cppCorpus, { fields: [cppPlaybooks.corpusId], references: [cppCorpus.id] }),
  purchases: many(cppPlaybookPurchases),
}));

export const playbookPurchaseRelations = relations(cppPlaybookPurchases, ({ one }) => ({
  playbook: one(cppPlaybooks, { fields: [cppPlaybookPurchases.playbookId], references: [cppPlaybooks.id] }),
}));
