-- Assistant (base role `sales`), step 1: who brought a student (owner, 2026-10-06). students.brought_by
-- is the sales profile that registered the student; brought_at is when. Existing students stay null;
-- an admin sets or changes it (set_student_brought_by, migration 273). Additive and re-runnable.
--   * A student created by a sales account is attributed to it by the trigger below, whatever path
--     created it (the booking wizard's create_booking, lead registration): created_by is the actor.
--   * brought_by must be a profile whose base role is sales: 'invalid_assistant' (P0001).
alter table public.students
  add column if not exists brought_by uuid references public.profiles (id),
  add column if not exists brought_at timestamptz;

alter table public.students drop constraint if exists students_brought_check;
alter table public.students add constraint students_brought_check
  check ((brought_by is null) = (brought_at is null));

create index if not exists students_brought_by_idx on public.students (brought_by, brought_at)
  where brought_by is not null;

create or replace function public.students_brought_guard() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.brought_by is null and new.created_by is not null
     and exists (select 1 from public.profiles p where p.id = new.created_by and p.role = 'sales') then
    new.brought_by := new.created_by;
  end if;
  if new.brought_by is null then
    new.brought_at := null;
  else
    if not exists (select 1 from public.profiles p where p.id = new.brought_by and p.role = 'sales') then
      raise exception 'invalid_assistant' using errcode = 'P0001';
    end if;
    new.brought_at := coalesce(new.brought_at, now());
  end if;
  return new;
end $$;

drop trigger if exists students_brought_guard_trg on public.students;
create trigger students_brought_guard_trg before insert or update of brought_by, brought_at on public.students
  for each row execute function public.students_brought_guard();
