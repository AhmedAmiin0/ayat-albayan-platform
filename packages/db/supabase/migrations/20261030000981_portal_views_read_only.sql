-- The family views are read-only (review 2026-10-30, authz-db-1). portal_* (migration 790, portal_packages
-- recreated by 934) and student_self (288) are owner-rights views (security_invoker = false) owned by postgres,
-- which bypasses RLS. Most of them are simple, auto-updatable views, and those migrations only revoked from
-- public / anon and granted select, so Supabase's default INSERT / UPDATE / DELETE grant to `authenticated`
-- stayed (staging, 2026-10-30: has_table_privilege true on all seven). A family login could then PATCH
-- /rest/v1/portal_packages (status, lessons_total, student_id …) or portal_students (status, code …) with no
-- API check, no payment and no audit, past the RLS of subscriptions / students / lesson_reports.
-- Only SELECT stays (the portal API reads these views; nothing writes through them).
-- `create or replace view` keeps these grants; a view that is dropped and created again must repeat this.
-- Idempotent (a revoke of a privilege not held is a no-op). Writes no row.
-- MANUAL ROLLBACK: grant insert, update, delete, truncate, references, trigger on the same views to authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.portal_students, public.portal_guardians, public.portal_lessons, public.portal_reports,
     public.portal_packages, public.portal_recordings, public.student_self
  from authenticated;
