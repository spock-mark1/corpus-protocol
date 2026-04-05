-- Add unique constraint on paymentSig to prevent replay attacks via TOCTOU race
CREATE UNIQUE INDEX IF NOT EXISTS "cpp_commerce_jobs_paymentSig_unique"
  ON "cppCommerceJobs" ("paymentSig")
  WHERE "paymentSig" IS NOT NULL;
