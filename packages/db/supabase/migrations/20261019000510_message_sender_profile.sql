-- Owner 2026-10-19 #4: every outgoing bubble names who sent it. created_by pointed at auth.users,
-- which PostgREST cannot embed; it now points at profiles (every staff user has one), so the API
-- reads sender:profiles!messages_created_by_fkey(full_name). user_references() still lists it once.
alter table public.messages drop constraint if exists messages_created_by_fkey;
alter table public.messages add constraint messages_created_by_fkey
  foreign key (created_by) references public.profiles (id) not valid;
do $$ begin
  alter table public.messages validate constraint messages_created_by_fkey;
exception when foreign_key_violation then
  raise warning 'messages_created_by_fkey left NOT VALID: some created_by have no profiles row';
end $$;
