-- Phase 2 verifier fixes (schema). R-NFR-02, R-SCH-02, R-SCH-04, R-SCH-06, R-SCH-07, R-SCH-08.

-- 1. Teachers wrote their own lessons through PostgREST (status, time, link, chargeable) because
-- the update policies check the row, not the columns. The API (service role) is the only writer:
-- drop the policies and take DML away from the client roles on every Phase 2 table.
drop policy lessons_teacher_update on public.lessons;
drop policy lesson_students_teacher_update on public.lesson_students;

-- 2. Idempotency per local date (R-SCH-02 "upsert by rule_id + date"): a tzdata change that moves
-- an instant must not add a second lesson on a date the rule already holds. local_date is the
-- lesson's calendar day in its rule's tz, filled by trigger so every writer gets it.
alter table public.lessons add column local_date date;

create function public.lessons_set_local_date() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if new.rule_id is null then
    new.local_date := null;
  else
    select (new.starts_at at time zone r.tz)::date into new.local_date
      from public.schedule_rules r where r.id = new.rule_id;
  end if;
  return new;
end $$;
create trigger lessons_local_date before insert or update of starts_at, rule_id on public.lessons
  for each row execute function public.lessons_set_local_date();

update public.lessons l set local_date = (l.starts_at at time zone r.tz)::date
  from public.schedule_rules r where r.id = l.rule_id;

-- Only generated rows hold a rule's slot. A moved lesson (rescheduled_from_id set) keeps rule_id
-- so rule cancel still finds it, but it no longer blocks its rule: moving a lesson back to its
-- old time works, and a not-yet-generated occurrence is still generated (issue B1 holds because
-- the cancelled / rescheduled original keeps its row).
alter table public.lessons drop constraint lessons_rule_id_starts_at_key;
create unique index lessons_rule_starts_uidx on public.lessons (rule_id, starts_at)
  where rescheduled_from_id is null;
create unique index lessons_rule_date_uidx on public.lessons (rule_id, local_date)
  where rescheduled_from_id is null;

-- 3. Clashes found when the daily job / extend generated a lesson without an admin override
-- (R-SCH-04, issue B3: DST shifts a Gulf-tz rule against a Cairo teacher). null = none.
alter table public.lessons add column conflicts jsonb;

-- 4. POST /booking idempotency key: a replayed submit returns the first booking.
alter table public.schedule_rules add column client_request_id uuid unique;

-- Rules booked before this stored the resolved link (the teacher's, or the student's own), which
-- the generator then treated as explicit: a later change of the teacher's link never reached new
-- lessons (R-LES-01, issue B8). Keep only links that differ from both, i.e. the admin's own.
update public.schedule_rules r set meeting_link = null
  where r.meeting_link is not null
    and (r.meeting_link = (select t.meeting_link from public.teachers t where t.id = r.teacher_id)
      or r.meeting_link in (select s.meeting_link_override from public.schedule_rule_students rs
                            join public.students s on s.id = rs.student_id where rs.rule_id = r.id));

-- 5. Teacher «اقترح ميعاد تاني» (R-SCH-08): the teacher proposes, an admin approves (the move is
-- an ordinary reschedule) or rejects. One pending proposal per lesson.
create type public.proposal_status as enum ('pending', 'approved', 'rejected');
create table public.lesson_proposals (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id),
  proposed_starts_at timestamptz not null,
  note text,
  status public.proposal_status not null default 'pending',
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  new_lesson_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create unique index lesson_proposals_pending_uidx on public.lesson_proposals (lesson_id)
  where status = 'pending';
create index lesson_proposals_status_idx on public.lesson_proposals (status, created_at);

alter table public.lesson_proposals enable row level security;
create policy lesson_proposals_admin_read on public.lesson_proposals for select to authenticated
  using (public.is_admin());
create policy lesson_proposals_teacher_read on public.lesson_proposals for select to authenticated
  using (teacher_id = (select public.my_teacher_id()));

-- Client roles read through RLS only; every write goes through the API (rule 9).
revoke all on public.schedule_rules, public.schedule_rule_students, public.lessons,
  public.lesson_students, public.messages, public.settings, public.lesson_proposals from anon;
revoke insert, update, delete, truncate, references, trigger on public.schedule_rules,
  public.schedule_rule_students, public.lessons, public.lesson_students, public.messages,
  public.settings, public.lesson_proposals from authenticated;

-- Generation keys on the local date (see 2). `do nothing` without a target covers both indexes.
create or replace function public.generate_rule_lessons(p_rule uuid, p_lessons jsonb, p_actor uuid)
  returns setof public.lessons language plpgsql set search_path = '' as $$
declare
  r public.schedule_rules;
begin
  -- Serialises with cancel / reschedule of the same rule (they end it under the same row lock).
  select * into r from public.schedule_rules s where s.id = p_rule for update;
  if r.id is null or r.status <> 'active' then
    raise exception 'rule_not_active' using errcode = 'P0001';
  end if;

  return query
  with ins as (
    insert into public.lessons as l (rule_id, teacher_id, starts_at, ends_at, meeting_link, created_by)
    select p_rule, r.teacher_id, o.starts_at, o.ends_at, o.meeting_link, p_actor
    from jsonb_to_recordset(p_lessons) as o(starts_at timestamptz, ends_at timestamptz, meeting_link text)
    on conflict do nothing
    returning l.*
  ), students as (
    insert into public.lesson_students (lesson_id, student_id)
    select ins.id, rs.student_id
    from ins cross join public.schedule_rule_students rs
    where rs.rule_id = p_rule
  )
  select * from ins order by ins.starts_at;
end $$;
