-- «اجتماع داخلي»: a standalone online room with no lesson, no students, no teacher and no WhatsApp,
-- for internal talks. Any staff login creates one (POST /meetings) and gets a link /m/<token> that
-- anyone may open (a name, then the room as a guest). LiveKit room `meeting-<id>` (derived, not
-- stored, like lessons in 181). Only the sha256 of the link token is kept, like lesson_join_links,
-- so the URL is shown once; «رابط جديد» (POST /meetings/:id/link) replaces the hash in place and the
-- old link stops working. `ends_at` is set by «إنهاء» (creator or admin); `revoked` is a database-side
-- kill switch (no route sets it): both refuse every later join with 410 meeting_ended.
-- No recording and no persistent removal: classroom_participants / classroom_blocks stay lesson-only.
-- The API (service role) is the only writer; staff read their own rows, the admin reads all (never the hash).
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'اجتماع' check (length(title) between 1 and 60),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  ends_at timestamptz,
  link_token_hash text unique check (link_token_hash ~ '^[0-9a-f]{64}$'),
  revoked boolean not null default false
);
create index meetings_created_by_idx on public.meetings (created_by, created_at desc);
create index meetings_created_at_idx on public.meetings (created_at desc);

alter table public.meetings enable row level security;
create policy meetings_staff_read on public.meetings for select
  to authenticated using (public.is_admin() or created_by = (select auth.uid()));
revoke all on public.meetings from anon;
revoke all on public.meetings from authenticated;
grant select (id, title, created_by, created_at, ends_at, revoked) on public.meetings to authenticated;
