-- «اطلب موعدًا آخر» of the family (owner 2026-11-17: «add button to accept or reject or
-- reschedule»): a guardian or student login asks to move one of their own lessons. It is a
-- lesson_proposals row like the teacher's «اقترح موعدًا آخر» (migration 110), marked by who asked.
-- 1. requested_by ('teacher' | 'family'): every existing row is a teacher's (the default). The
--    requester's user id is the existing created_by (always set by the API); no second column.
-- 2. decision_note: the answer's note («لا يتوفر وقت آخر هذا الأسبوع»), shown to the family.
-- 3. 'withdrawn': the family's «سحب الطلب» of their own pending request.
-- 4. push_kind 'lesson_request_declined': the family's bell / push when staff decline.
-- 5. RLS (rule 9): the API reads and writes with the service role; a portal login reads its own
--    requests through the API only (no portal policy, no view). The owning assistant reads the
--    family requests of her students (is_my_sales_lesson, migration 187). Admin / teacher policies
--    are unchanged.
-- New enum values are not used in this transaction (Postgres refuses that), only added.
-- Idempotent; expand-only: the previous API never reads the new columns.
-- MANUAL ROLLBACK (after the code rollback): drop the policy and the two indexes, then the columns;
-- the enum values stay (Postgres cannot drop them; unused, they are harmless).

alter type public.proposal_status add value if not exists 'withdrawn';
alter type public.push_kind add value if not exists 'lesson_request_declined';

alter table public.lesson_proposals
  add column if not exists requested_by text not null default 'teacher',
  add column if not exists decision_note text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lesson_proposals_requested_by_check') then
    alter table public.lesson_proposals add constraint lesson_proposals_requested_by_check
      check (requested_by in ('teacher', 'family'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lesson_proposals_decision_note_len') then
    alter table public.lesson_proposals add constraint lesson_proposals_decision_note_len
      check (decision_note is null or char_length(decision_note) <= 500);
  end if;
end $$;

-- «طلبات الأسر»: the pending family requests, oldest first (a small partial index).
create index if not exists lesson_proposals_family_pending_idx
  on public.lesson_proposals (created_at)
  where status = 'pending' and requested_by = 'family';
-- FK lookups by the requester (created_by had no index).
create index if not exists lesson_proposals_created_by_idx on public.lesson_proposals (created_by);

drop policy if exists lesson_proposals_sales_read on public.lesson_proposals;
create policy lesson_proposals_sales_read on public.lesson_proposals for select to authenticated
  using (requested_by = 'family' and public.is_my_sales_lesson(lesson_id));

