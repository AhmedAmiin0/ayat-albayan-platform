-- Work for an admin raised by a job (R-SUB-02 «admin task»). dedup_key makes raising idempotent
-- (rule 8), e.g. renewal_due:{subscription_id}. subject_* point at the row the task is about.
create type public.admin_task_kind as enum ('renewal_due', 'subscription_unpaid');
create table public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  kind public.admin_task_kind not null,
  subject_type text not null,
  subject_id uuid not null,
  -- Optional free note; the UI words a task from ar.json dashboard.task.<kind>.
  title text,
  due_at timestamptz,
  done_at timestamptz,
  done_by uuid references auth.users (id),
  dedup_key text not null unique,
  created_at timestamptz not null default now()
);
create index admin_tasks_open_idx on public.admin_tasks (created_at) where done_at is null;
create index admin_tasks_subject_idx on public.admin_tasks (subject_type, subject_id);

alter table public.admin_tasks enable row level security;
create policy admin_tasks_admin on public.admin_tasks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.admin_tasks from anon;
revoke insert, update, delete, truncate, references, trigger on public.admin_tasks
  from authenticated;
