-- Automatic chat lists (owner 2026-10-25, docs/22 «القوائم التلقائية»): «مشترك» holds every family with a
-- running subscription (a student `active`; R-STU-05: pending_renewal is not «مشترك») and «معلم» every
-- active teacher. Added once now (backfill), then kept up to date by triggers. EXPAND ONLY and ADD ONLY:
-- nothing here ever deletes a member (a hand-added chat stays, and an automatic member stays when the
-- subscription ends). Members can still be added and removed by hand through the API, as before. added_by
-- stays null for automatic rows. RLS and grants are unchanged. Never reads or writes public.settings.
-- Idempotent: safe to run twice.

set local lock_timeout = '5s';

alter table public.chat_lists add column if not exists auto_rule text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chat_lists_auto_rule_check'
      and conrelid = 'public.chat_lists'::regclass) then
    alter table public.chat_lists add constraint chat_lists_auto_rule_check
      check (auto_rule in ('subscribed', 'teachers'));
  end if;
end $$;
-- At most one list per rule.
create unique index if not exists chat_lists_auto_rule_key on public.chat_lists (auto_rule) where auto_rule is not null;

-- Attach each rule to the existing list by the key the app computes (chatListNameKey = normalizeArabic:
-- «مشترك» → 'مشترك', «معلم» / «مُعلّم» → 'معلم'); create the list when it is missing (created_by null). At
-- the 30-list cap the migration stops with an error (nothing applied): free a list, then push again.
do $$
declare
  r record;
begin
  for r in select * from (values ('subscribed', 'مشترك'), ('teachers', 'معلم')) as v (rule, name) loop
    if exists (select 1 from public.chat_lists where auto_rule = r.rule) then
      continue;
    end if;
    update public.chat_lists set auto_rule = r.rule where name_key = r.name and auto_rule is null;
    if not found then
      if (select count(*) from public.chat_lists) >= 30 then
        raise exception 'chat_list_auto_rules: 30 lists already, «%» cannot be created; delete one list first', r.name
          using errcode = '23514';
      end if;
      insert into public.chat_lists (name, name_key, auto_rule) values (r.name, r.name, r.rule);
    end if;
  end loop;
end $$;

-- Adds one chat to the rule's list. Never removes; a phone that fails the members' E.164 check (or null)
-- is skipped; already a member = no-op.
create or replace function public.chat_list_auto_add(p_rule text, p_phone text) returns void
  language sql security definer set search_path = public, pg_temp as $$
  insert into public.chat_list_threads (list_id, phone_e164)
    select l.id, p_phone from public.chat_lists l
    where l.auto_rule = p_rule and p_phone ~ '^\+[1-9][0-9]{7,14}$'
  on conflict do nothing;
$$;
revoke all on function public.chat_list_auto_add(text, text) from public, anon, authenticated;

-- A student becomes active (insert, status change, or moved to another guardian).
create or replace function public.students_chat_list_auto() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.chat_list_auto_add('subscribed', (select g.phone_e164::text from public.guardians g where g.id = new.guardian_id));
  return null;
end $$;
drop trigger if exists students_chat_list_auto_ins on public.students;
create trigger students_chat_list_auto_ins after insert on public.students
  for each row when (new.status = 'active')
  execute function public.students_chat_list_auto();
drop trigger if exists students_chat_list_auto_upd on public.students;
create trigger students_chat_list_auto_upd after update of status, guardian_id on public.students
  for each row when (new.status = 'active'
    and (old.status is distinct from new.status or old.guardian_id is distinct from new.guardian_id))
  execute function public.students_chat_list_auto();

-- A teacher is inserted or updated as active, or an active teacher's phone changes.
create or replace function public.teachers_chat_list_auto() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.chat_list_auto_add('teachers', new.phone_e164::text);
  return null;
end $$;
drop trigger if exists teachers_chat_list_auto_ins on public.teachers;
create trigger teachers_chat_list_auto_ins after insert on public.teachers
  for each row when (new.status = 'active' and new.phone_e164 is not null)
  execute function public.teachers_chat_list_auto();
drop trigger if exists teachers_chat_list_auto_upd on public.teachers;
create trigger teachers_chat_list_auto_upd after update of status, phone_e164 on public.teachers
  for each row when (new.status = 'active' and new.phone_e164 is not null
    and (old.status is distinct from new.status or old.phone_e164 is distinct from new.phone_e164))
  execute function public.teachers_chat_list_auto();

-- A guardian's phone changes while one of their students has a running subscription: the new number is
-- added (the old one stays).
create or replace function public.guardians_chat_list_auto() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.students s where s.guardian_id = new.id and s.status = 'active') then
    perform public.chat_list_auto_add('subscribed', new.phone_e164::text);
  end if;
  return null;
end $$;
drop trigger if exists guardians_chat_list_auto_upd on public.guardians;
create trigger guardians_chat_list_auto_upd after update of phone_e164 on public.guardians
  for each row when (old.phone_e164 is distinct from new.phone_e164)
  execute function public.guardians_chat_list_auto();

revoke all on function public.students_chat_list_auto() from public, anon, authenticated;
revoke all on function public.teachers_chat_list_auto() from public, anon, authenticated;
revoke all on function public.guardians_chat_list_auto() from public, anon, authenticated;

-- Backfill: guardians of students with a running subscription, and active teachers. AFTER the triggers: a
-- student activated while this runs is caught by the trigger (once it exists) or by this later snapshot.
insert into public.chat_list_threads (list_id, phone_e164)
  select l.id, p.phone from public.chat_lists l
  cross join (select distinct g.phone_e164::text as phone from public.guardians g
    join public.students s on s.guardian_id = g.id
    where s.status = 'active') p
  where l.auto_rule = 'subscribed' and p.phone ~ '^\+[1-9][0-9]{7,14}$'
on conflict do nothing;
insert into public.chat_list_threads (list_id, phone_e164)
  select l.id, t.phone_e164 from public.chat_lists l
  cross join public.teachers t
  where l.auto_rule = 'teachers' and t.status = 'active' and t.phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
on conflict do nothing;

-- MANUAL ROLLBACK (only after the code rollback; members already added stay):
--   drop trigger if exists students_chat_list_auto_ins on public.students;
--   drop trigger if exists students_chat_list_auto_upd on public.students;
--   drop trigger if exists teachers_chat_list_auto_ins on public.teachers;
--   drop trigger if exists teachers_chat_list_auto_upd on public.teachers;
--   drop trigger if exists guardians_chat_list_auto_upd on public.guardians;
--   drop function if exists public.students_chat_list_auto(), public.teachers_chat_list_auto(),
--     public.guardians_chat_list_auto(), public.chat_list_auto_add(text, text);
--   drop index if exists public.chat_lists_auto_rule_key;
--   alter table public.chat_lists drop column if exists auto_rule;
