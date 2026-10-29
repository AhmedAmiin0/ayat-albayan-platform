-- «رقم ثانٍ للعائلة» (owner 2026-10-29): a family may chat from a second WhatsApp number. Every family number
-- lives in public.guardian_phones, the main one mirrored from guardians.phone_e164 (is_primary) by a trigger.
-- The primary key is the phone, so one number belongs to one family (main or second), atomically.
--   * guardians.phone_e164 stays as it is: create_booking's `on conflict (phone_e164)`, notifications, family
--     sign-in and teacher mode keep using the MAIN number only.
--   * A main number equal to another family's second number fails with 23505 guardian_phones_pkey (the API
--     already answers 409 phone_taken for a guardians write).
--   * At most ONE second number per family (guardian_phones_one_second).
--     ponytail: owner wants one; drop that index to allow more.
--   * A second number that is a teacher's raises 'teacher_number' (P0001). Main rows are never checked. A
--     teacher whose phone is a family's second number fails as a unique violation (teachers_not_family_number).
--   * A second number of a family with an active child joins «مشترك» at once (chat_list_auto_add, migration 710).
--   * Only two service-role functions write second numbers, each with its audit row in the same transaction:
--     link_family_phone (POST /leads/:id/link-family, which also converts the lead) and remove_family_phone
--     (the admin's DELETE /guardians/:id/phones/:phone).
-- RLS: reads only (as 921 / 955). The admin reads all, an assistant her families' numbers (my_sales_guardian_ids);
-- nobody writes through PostgREST. Idempotent.
-- SQL test plan (local DB, begin … rollback):
--   1. select count(*) from public.guardian_phones = select count(*) from public.guardians (after the backfill).
--   2. insert a guardian → one is_primary row; update its phone → the row moves; update it to its own second
--      number → the second row is gone and that number is the primary.
--   3. update a guardian's phone to another family's second number → 23505 guardian_phones_pkey.
--   4. insert a second number equal to a teacher's → 'teacher_number'; a second one on the same family →
--      23505 guardian_phones_one_second.
--   5. a second number of a family with an active student → a row in chat_list_threads of the 'subscribed' list.
--   6. link_family_phone on a contacted lead → one second row, two audit_log rows, the lead converted; again →
--      false and nothing new; for another family's main number → 'lead_has_family'.
--   7. remove_family_phone of the second number → the row gone + one audit_log row; again → 'phone_not_found'.
--   8. update a teacher's phone to a family's second number → 23505 'family_number'.
--   9. as an authenticated admin: insert / update / delete on guardian_phones → permission denied.

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

-- A teacher never takes a family's second number (the other way round is guardian_phones_second).
create or replace function public.teachers_not_family_number() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.guardian_phones gp where gp.phone_e164 = new.phone_e164 and not gp.is_primary) then
    raise exception 'family_number' using errcode = '23505';
  end if;
  return new;
end $$;
revoke all on function public.teachers_not_family_number() from public, anon, authenticated;

drop trigger if exists teachers_not_family_number on public.teachers;
create trigger teachers_not_family_number before insert or update of phone_e164 on public.teachers
  for each row when (new.phone_e164 is not null)
  execute function public.teachers_not_family_number();

-- Reads only: every write is a security definer function or trigger (as migrations 921 / 955).
alter table public.guardian_phones enable row level security;
revoke all on public.guardian_phones from anon;
revoke insert, update, delete, truncate, references, trigger on public.guardian_phones from authenticated;
drop policy if exists guardian_phones_admin on public.guardian_phones;
drop policy if exists guardian_phones_admin_read on public.guardian_phones;
create policy guardian_phones_admin_read on public.guardian_phones for select to authenticated
  using (public.is_admin());
drop policy if exists guardian_phones_sales_read on public.guardian_phones;
create policy guardian_phones_sales_read on public.guardian_phones for select to authenticated
  using (guardian_id in (select public.my_sales_guardian_ids()));

-- «ربط بطالب موجود»: the lead's number becomes the second number of the family of the student with this code,
-- then the lead moves to converted. true = added now; false = already a number of that family. It never sets
-- leads.converted_guardian_id nor leads.assigned_to: linking makes nobody an owner of that family.
-- P0001 lead_not_found, student_not_found, lead_has_family (another family's main number), number_taken
-- (another family's second number), teacher_number; 23505 guardian_phones_one_second, or guardian_phones_pkey
-- when a guardians write took the number meanwhile (the API calls again and gets the answer for its holder).
create or replace function public.link_family_phone(p_lead uuid, p_code text, p_actor uuid)
  returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  v_phone public.leads.phone_e164%type;
  v_status public.leads.status%type;
  v_guardian uuid;
  v_holder uuid;
  v_primary boolean;
begin
  -- The row lock turns the status move below into a compare-and-set that no concurrent move slips past.
  select l.phone_e164, l.status into v_phone, v_status from public.leads l where l.id = p_lead for update;
  if not found then
    raise exception 'lead_not_found' using errcode = 'P0001';
  end if;
  select s.guardian_id into v_guardian from public.students s where s.code = p_code;
  if not found then
    raise exception 'student_not_found' using errcode = 'P0001';
  end if;
  select gp.guardian_id, gp.is_primary into v_holder, v_primary
    from public.guardian_phones gp where gp.phone_e164 = v_phone;
  if v_holder is not null and v_holder <> v_guardian and v_primary then
    raise exception 'lead_has_family' using errcode = 'P0001';
  elsif v_holder is not null and v_holder <> v_guardian then
    raise exception 'number_taken' using errcode = 'P0001';
  elsif v_holder is null then
    insert into public.guardian_phones (phone_e164, guardian_id, is_primary, created_by)
      values (v_phone, v_guardian, false, p_actor);
    insert into public.audit_log (actor_id, entity, entity_id, action, after)
      values (p_actor, 'guardians', v_guardian, 'phone_linked',
              jsonb_build_object('phone_e164', v_phone, 'lead_id', p_lead, 'student_code', p_code));
  end if;
  -- Every status but converted may move to converted (LEAD_TRANSITIONS, lead-state-machine.ts).
  if v_status <> 'converted' then
    update public.leads set status = 'converted' where id = p_lead;
    insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
      values (p_actor, 'leads', p_lead, 'status_change', jsonb_build_object('status', v_status),
              jsonb_build_object('status', 'converted', 'via', 'link_family'));
  end if;
  return v_holder is null;
end $$;
revoke execute on function public.link_family_phone(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.link_family_phone(uuid, text, uuid) to service_role;

-- The admin removes a family's SECOND number (never the main one), audited in the same transaction.
-- P0001 phone_not_found for the main number, another family's number or an unknown one.
create or replace function public.remove_family_phone(p_guardian uuid, p_phone text, p_actor uuid)
  returns void
  language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guardian_phones gp
   where gp.guardian_id = p_guardian and gp.phone_e164 = p_phone and not gp.is_primary;
  if not found then
    raise exception 'phone_not_found' using errcode = 'P0001';
  end if;
  insert into public.audit_log (actor_id, entity, entity_id, action, before)
    values (p_actor, 'guardians', p_guardian, 'phone_removed', jsonb_build_object('phone_e164', p_phone));
end $$;
revoke execute on function public.remove_family_phone(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.remove_family_phone(uuid, text, uuid) to service_role;

-- Backfill AFTER the triggers: a guardian written while this runs is mirrored by the trigger or by this snapshot.
insert into public.guardian_phones (phone_e164, guardian_id, is_primary, created_by)
  select g.phone_e164, g.id, true, g.created_by from public.guardians g
on conflict do nothing;

-- Down (manual, after the code rollback; run 974's down first):
--   drop trigger if exists guardians_phone_mirror_ins on public.guardians;
--   drop trigger if exists guardians_phone_mirror_upd on public.guardians;
--   drop trigger if exists teachers_not_family_number on public.teachers;
--   drop table if exists public.guardian_phones;
--   drop function if exists public.guardians_phone_mirror(), public.guardian_phones_second(),
--     public.teachers_not_family_number(), public.link_family_phone(uuid, text, uuid),
--     public.remove_family_phone(uuid, text, uuid);
