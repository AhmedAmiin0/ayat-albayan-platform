-- Merge history (R-STU-03). merged_id has no FK: the merged row may be deleted after the merge;
-- snapshot keeps its full content so history survives.
create table public.student_merges (
  id uuid primary key default gen_random_uuid(),
  kept_id uuid not null references public.students (id),
  merged_id uuid not null,
  merged_by uuid references auth.users (id),
  at timestamptz not null default now(),
  snapshot jsonb not null default '{}'::jsonb
);
create index student_merges_kept_idx on public.student_merges (kept_id);
create index student_merges_merged_idx on public.student_merges (merged_id);

alter table public.student_merges enable row level security;
create policy student_merges_admin on public.student_merges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
