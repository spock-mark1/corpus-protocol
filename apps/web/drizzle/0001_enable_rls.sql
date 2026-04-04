-- Enable Row Level Security on all tables
ALTER TABLE "cpp_corpus" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cpp_patrons" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cpp_activities" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cpp_approvals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cpp_revenues" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cpp_commerce_services" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cpp_commerce_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cpp_playbooks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cpp_playbook_purchases" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Public read access (anon role)
CREATE POLICY "anon_read_corpus" ON "cpp_corpus" FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "anon_read_activities" ON "cpp_activities" FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "anon_read_revenues" ON "cpp_revenues" FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "anon_read_commerce_services" ON "cpp_commerce_services" FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "anon_read_playbooks" ON "cpp_playbooks" FOR SELECT TO anon USING (true);
--> statement-breakpoint
CREATE POLICY "anon_read_patrons" ON "cpp_patrons" FOR SELECT TO anon USING (true);
--> statement-breakpoint

-- Authenticated users: full read + scoped write
CREATE POLICY "auth_read_corpus" ON "cpp_corpus" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "auth_insert_corpus" ON "cpp_corpus" FOR INSERT TO authenticated WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "auth_update_corpus" ON "cpp_corpus" FOR UPDATE TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "auth_all_patrons" ON "cpp_patrons" FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "auth_all_activities" ON "cpp_activities" FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "auth_all_approvals" ON "cpp_approvals" FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "auth_all_revenues" ON "cpp_revenues" FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "auth_all_commerce_services" ON "cpp_commerce_services" FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "auth_all_commerce_jobs" ON "cpp_commerce_jobs" FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "auth_all_playbooks" ON "cpp_playbooks" FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "auth_all_playbook_purchases" ON "cpp_playbook_purchases" FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

-- Note: service_role bypasses RLS by default in Supabase
