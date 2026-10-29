-- «رقم ثانٍ للعائلة» (owner 2026-10-29): a family may chat from a second WhatsApp number. Every family number
-- lives in public.guardian_phones, the main one mirrored from guardians.phone_e164 (is_primary) by a trigger.
-- The primary key is the phone, so one number belongs to one family (main or second), atomically.
--   * guardians.phone_e164 stays as it is: create_booking's `on conflict (phone_e164)`, notifications, family
--     sign-in and teacher mode keep using the MAIN number only.
--   * A main number equal to another family's second number fails with 23505 guardian_phones_pkey (the API
--     already answers 409 phone_taken for a guardians write).
--   * At most ONE second number per family (guardian_phones_one_second).
--     ponytail: owner wants one; drop that index to allow more.
--   * A second number that is a teacher's raises 'teacher_number' (P0001). Main rows are never checked.
--   * A second number of a family with an active child joins «مشترك» at once (chat_list_auto_add, migration 710).
--   * Only the API (service role) writes second numbers: POST /leads/:id/link-family adds one, the admin's
--     DELETE /guardians/:id/phones/:phone removes one. Both are audited there.
-- RLS as guardians: the admin all, an assistant reads her families' numbers (my_sales_guardian_ids). Idempotent.
-- SQL test plan (local DB, begin … rollback):
--   1. select count(*) from public.guardian_phones = select count(*) from public.guardians (after the backfill).
--   2. insert a guardian → one is_primary row; update its phone → the row moves; update it to its own second
--      number → the second row is gone and that number is the primary.
--   3. update a guardian's phone to another family's second number → 23505 guardian_phones_pkey.
--   4. insert a second number equal to a teacher's → 'teacher_number'; a second one on the same family →
--      23505 guardian_phones_one_second.
--   5. a second number of a family with an active student → a row in chat_list_threads of the 'subscribed' list.

set local lock_timeout = '5s';

create table if not exists public.guardian_phones (
  phone_e164 public.e164 primary key,
  guardian_id uuid not null references public.guardians (id) on delete cascade,
  is_primary boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists guardian_phones_guardian_idx on public.guardian_phones (guardian_id);
create unique index if not exists guardian_phones_one_primary on public.guardian_phones (guardian_id) where is_primary;
create unique index if not exists guardian_phones_one_second on public.guardian_phones (guardian_id) where not is_primary;
create index if not exists guardian_phones_created_by_idx on public.guardian_phones (created_by) where created_by is not null;

-- The main number, mirrored. The delete also covers a swap (the main number becomes the family's own second).
create or replace function public.guardians_phone_mirror() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guardian_phones
   where guardian_id = new.id and (is_primary or phone_e164 = new.phone_e164);
  insert into public.guardian_phones (phone_e164, guardian_id, is_primary, created_by)
    values (new.phone_e164, new.id, true, new.created_by);
  return null;
end $$;
revoke all on function public.guardians_phone_mirror() from public, anon, authenticated;

drop trigger if exists guardians_phone_mirror_ins on public.guardians;
create trigger guardians_phone_mirror_ins after insert on public.guardians
  for each row execute function public.guardians_phone_mirror();
drop trigger if exists guardians_phone_mirror_upd on public.guardians;
create trigger guardians_phone_mirror_upd after update of phone_e164 on public.guardians
  for each row when (old.phone_e164 is distinct from new.phone_e164)
  execute function public.guardians_phone_mirror();

-- A second number: never a teacher's; joins «مشترك» when the family has a running subscription.
create or replace function public.guardian_phones_second() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.teachers t where t.phone_e164 = new.phone_e164) then
    raise exception 'teacher_number' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.students s where s.guardian_id = new.guardian_id and s.status = 'active') then
    perform public.chat_list_auto_add('subscribed', new.phone_e164::text);
  end if;
  return null;
end $$;
revoke all on function public.guardian_phones_second() from public, anon, authenticated;

drop trigger if exists guardian_phones_second on public.guardian_phones;
create trigger guardian_phones_second after insert on public.guardian_phones
  for each row when (not new.is_primary)
  execute function public.guardian_phones_second();

alter table public.guardian_phones enable row level security;
drop policy if exists guardian_phones_admin on public.guardian_phones;
create policy guardian_phones_admin on public.guardian_phones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists guardian_phones_sales_read on public.guardian_phones;
create policy guardian_phones_sales_read on public.guardian_phones for select to authenticated
  using (guardian_id in (select public.my_sales_guardian_ids()));
revoke all on public.guardian_phones from anon;

-- Backfill AFTER the triggers: a guardian written while this runs is mirrored by the trigger or by this snapshot.
insert into public.guardian_phones (phone_e164, guardian_id, is_primary, created_by)
  select g.phone_e164, g.id, true, g.created_by from public.guardians g
on conflict do nothing;

-- Down (manual, after the code rollback; run 974's down first):
--   drop trigger if exists guardians_phone_mirror_ins on public.guardians;
--   drop trigger if exists guardians_phone_mirror_upd on public.guardians;
--   drop table if exists public.guardian_phones;
--   drop function if exists public.guardians_phone_mirror(), public.guardian_phones_second();
