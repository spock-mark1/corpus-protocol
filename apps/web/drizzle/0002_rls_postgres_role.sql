-- Allow postgres role full access (bypasses RLS for server-side API routes)
CREATE POLICY "postgres_all_corpus" ON "cpp_corpus" FOR ALL TO postgres USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "postgres_all_patrons" ON "cpp_patrons" FOR ALL TO postgres USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "postgres_all_activities" ON "cpp_activities" FOR ALL TO postgres USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "postgres_all_approvals" ON "cpp_approvals" FOR ALL TO postgres USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "postgres_all_revenues" ON "cpp_revenues" FOR ALL TO postgres USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "postgres_all_commerce_services" ON "cpp_commerce_services" FOR ALL TO postgres USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "postgres_all_commerce_jobs" ON "cpp_commerce_jobs" FOR ALL TO postgres USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "postgres_all_playbooks" ON "cpp_playbooks" FOR ALL TO postgres USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "postgres_all_playbook_purchases" ON "cpp_playbook_purchases" FOR ALL TO postgres USING (true) WITH CHECK (true);
