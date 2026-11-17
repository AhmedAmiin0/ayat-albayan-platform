-- «إخراج» keeps the PERSON out (owner 2026-11-16, review): a link sent by WhatsApp («ابعت لينك
-- الحلقة») named its student only in the message, so in a group lesson a removal could not find the
-- family's other links. sent_for_student_id records whom a sent link is for (student_id stays the
-- one (lesson, student) row of the portal and the student's link, unique per lesson). Expand-only:
-- the previous API never writes it; older rows stay null.
-- RLS / grants: unchanged (a new column of lesson_join_links keeps its policies; only the API's
-- service role writes it).
-- MANUAL ROLLBACK: drop index if exists public.lesson_join_links_sent_for_idx;
--   alter table public.lesson_join_links drop column if exists sent_for_student_id;

alter table public.lesson_join_links
  add column if not exists sent_for_student_id uuid references public.students (id) on delete set null;

-- The removal reads one lesson's links by student (and the FK's deletes find them).
create index if not exists lesson_join_links_sent_for_idx
  on public.lesson_join_links (sent_for_student_id) where sent_for_student_id is not null;
