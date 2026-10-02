-- Lesson reports (R-REP-01..05; issues A7, D1, D2). One report per student per lesson; the
-- teacher opens it from the lesson (identity is never typed), saves drafts, submits; every submit
-- snapshots a version. The PDF is rendered by a job (pdf_status) and sent to the guardian.
create type public.report_status as enum ('draft', 'submitted');
create type public.pdf_status as enum ('pending', 'rendering', 'ready', 'failed');

-- The six rubric columns are the «تقييم البنود» rows of the «تقرير الحلقة» Google Form:
-- recitation التلاوة والنطق · memorization الحفظ الجديد · revision المراجعة · tajweed التجويد ·
-- engagement الاستيعاب والتفاعل · commitment الالتزام والحضور.
create table public.lesson_reports (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  student_id uuid not null,
  teacher_id uuid not null references public.teachers (id),
  attendance public.attendance,
  recited text,
  new_memorization text,
  revision text,
  theory text,
  grade_recitation public.grade,
  grade_memorization public.grade,
  grade_revision public.grade,
  grade_tajweed public.grade,
  grade_engagement public.grade,
  grade_commitment public.grade,
  grade_overall public.grade,
  notes text,
  homework text,
  next_plan text,
  status public.report_status not null default 'draft',
  -- 0 while a draft was never submitted; every submit (first or edit) adds 1 (R-REP-02).
  version int not null default 0 check (version >= 0),
  -- First submit: the teacher's edit window (report_teacher_edit_hours) counts from here.
  submitted_at timestamptz,
  -- Last change after the first submit.
  edited_at timestamptz,
  -- reports/{student_id}/{lesson_id}.pdf (R-REP-03). null = no PDF requested yet (draft).
  pdf_path text,
  pdf_status public.pdf_status,
  pdf_error text,
  -- When the report_ready WhatsApp message went out (Phase 4 sender).
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  -- One report per lesson and student; a resubmission updates this row (R-REP-04, issue A7).
  unique (lesson_id, student_id),
  -- The student must be on the lesson. on update cascade: merge_students re-points
  -- lesson_students.student_id and the report follows.
  foreign key (lesson_id, student_id) references public.lesson_students (lesson_id, student_id)
    on delete cascade on update cascade,
  check (status = 'draft' or (attendance is not null and submitted_at is not null and version >= 1))
);
create index lesson_reports_student_idx on public.lesson_reports (student_id, submitted_at desc);
create index lesson_reports_teacher_idx on public.lesson_reports (teacher_id, status);
create index lesson_reports_pdf_idx on public.lesson_reports (pdf_status) where pdf_status is not null;
create trigger lesson_reports_updated_at before update on public.lesson_reports
  for each row execute function public.set_updated_at();

-- Every submitted version, whole (R-REP-02 "versioned", R-NFR-03 report edits).
create table public.lesson_report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.lesson_reports (id) on delete cascade,
  version int not null check (version >= 1),
  snapshot jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (report_id, version)
);

-- Files the teacher attaches (R-REP-02): bucket report-attachments, path {report_id}/{uuid}.{ext}.
create table public.report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.lesson_reports (id) on delete cascade,
  storage_path text not null unique,
  mime text not null,
  size bigint not null check (size > 0),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index report_attachments_report_idx on public.report_attachments (report_id);

-- RLS (rule 9): admin all; a teacher reads own reports; a guardian reads own children's
-- submitted reports. Every write goes through the API (service role), as in migration 110.
alter table public.lesson_reports enable row level security;
alter table public.lesson_report_versions enable row level security;
alter table public.report_attachments enable row level security;

create function public.is_my_report(p_report uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lesson_reports
                 where id = p_report and teacher_id = public.my_teacher_id())
$$;

create function public.is_my_child_report(p_report uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lesson_reports
                 where id = p_report and status = 'submitted'
                   and student_id in (select public.my_student_ids()))
$$;

create policy lesson_reports_admin on public.lesson_reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy lesson_reports_teacher_read on public.lesson_reports for select to authenticated
  using (teacher_id = (select public.my_teacher_id()));
create policy lesson_reports_guardian_read on public.lesson_reports for select to authenticated
  using (status = 'submitted' and student_id in (select public.my_student_ids()));

create policy lesson_report_versions_admin on public.lesson_report_versions for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy lesson_report_versions_teacher_read on public.lesson_report_versions for select
  to authenticated using (public.is_my_report(report_id));

create policy report_attachments_admin on public.report_attachments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy report_attachments_teacher_read on public.report_attachments for select
  to authenticated using (public.is_my_report(report_id));
create policy report_attachments_guardian_read on public.report_attachments for select
  to authenticated using (public.is_my_child_report(report_id));

revoke all on public.lesson_reports, public.lesson_report_versions, public.report_attachments
  from anon;
revoke insert, update, delete, truncate, references, trigger on public.lesson_reports,
  public.lesson_report_versions, public.report_attachments from authenticated;
