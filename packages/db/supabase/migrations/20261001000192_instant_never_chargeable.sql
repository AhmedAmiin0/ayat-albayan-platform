-- An instant lesson («ابدأ الآن», migration 190) never consumes a package and is never made up:
-- every attendance outcome rewrites lesson_students.chargeable (lesson-status / outcomes), so the
-- rule lives here, on the row, for every writer. A no_show on an instant lesson therefore stays
-- not chargeable, and create_booking's makeup check (ls.chargeable) refuses it.

create or replace function public.lesson_students_instant_not_chargeable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.chargeable and exists (select 1 from public.lessons l where l.id = new.lesson_id and l.instant) then
    new.chargeable := false;
  end if;
  return new;
end;
$$;

create trigger lesson_students_instant_not_chargeable
  before insert or update of chargeable on public.lesson_students
  for each row execute function public.lesson_students_instant_not_chargeable();

-- Rows written before this trigger existed.
update public.lesson_students ls set chargeable = false
  from public.lessons l
  where l.id = ls.lesson_id and l.instant and ls.chargeable;
