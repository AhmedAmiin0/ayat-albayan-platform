-- «رأيك يهمّنا» (student feedback) — the third Google Form (docs/13-forms-spec.md). The admin asks
-- for it from a completed lesson («ابعت طلب الرأي»): a pending row is created and a signed link
-- goes to the guardian by WhatsApp; the family fills the public page once. The API (service role)
-- is the only writer: token check, expiry, one submission, rate limit.
create type public.feedback_kind as enum ('trial', 'subscription');
create type public.feedback_recommend as enum ('yes', 'maybe', 'no');

create table public.lesson_feedback (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  student_id uuid not null,
  -- Whose phone gets the link and is prefilled; no ON DELETE: clear:demo refuses rather than detaches.
  guardian_id uuid not null references public.guardians (id),
  teacher_id uuid not null references public.teachers (id),
  -- Server-derived at request time (the lesson's rule is the free trial or not); never client-sent.
  kind public.feedback_kind not null,
  -- sha256 (hex) of the signed token; the token itself is not stored on this table (it rides in the request message, which
  -- migration 168 keeps out of a teacher's reach). A resend replaces it, which
  -- revokes the old link.
  token_hash text not null unique,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  rating smallint check (rating between 1 and 5),
  recommend public.feedback_recommend,
  note text check (char_length(note) <= 2000),
  contact_phone text check (contact_phone ~ '^\+[1-9][0-9]{6,14}$'),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lesson_id, student_id),
  -- merge_students re-points lesson_students.student_id and the feedback follows (as reports do).
  foreign key (lesson_id, student_id) references public.lesson_students (lesson_id, student_id)
    on delete cascade on update cascade,
  -- «تقييمك للحلقة *» and «هل ترشّح…؟ *» are required on the form: a submitted row has both.
  check (submitted_at is null or (rating is not null and recommend is not null))
);
create index lesson_feedback_teacher_idx on public.lesson_feedback (teacher_id, submitted_at);

-- RLS (rule 9): the admin reads all, a teacher only their own rows. No write policy: only the API
-- (service role) inserts and updates. Teachers must not see the family's phone or the link hash,
-- so the table is readable by column.
alter table public.lesson_feedback enable row level security;
create policy lesson_feedback_admin_read on public.lesson_feedback for select to authenticated
  using (public.is_admin());
create policy lesson_feedback_teacher_read on public.lesson_feedback for select to authenticated
  using (teacher_id = (select public.my_teacher_id()));
revoke all on public.lesson_feedback from anon;
revoke all on public.lesson_feedback from authenticated;
grant select (id, lesson_id, student_id, teacher_id, kind, requested_at, expires_at, rating,
              recommend, note, submitted_at, created_at) on public.lesson_feedback to authenticated;

-- Per teacher, submitted rows only. security_invoker: a teacher's RLS makes it their own average.
create view public.v_teacher_feedback_avg with (security_invoker = true) as
  select f.teacher_id,
         round(avg(f.rating)::numeric, 2) as avg_rating,
         count(*)::int as n,
         round(100.0 * count(*) filter (where f.recommend = 'yes') / count(*), 1) as recommend_yes_pct
  from public.lesson_feedback f
  where f.submitted_at is not null
  group by f.teacher_id;
revoke all on public.v_teacher_feedback_avg from anon;
grant select on public.v_teacher_feedback_avg to authenticated, service_role;

-- The request message (not on Meta yet: status not_submitted). Submitted only by the admin's
-- explicit POST /messaging/templates/:key/submit, never automatically. {{1}} student, {{2}} teacher;
-- the URL button carries the signed token. The host is the web app's; change it (while the row is
-- not_submitted) when the web moves to its final domain, Meta fixes the URL at submission.
insert into public.message_templates
  (key, meta_name, category, params, buttons, body_ar, footer_ar) values
  ('lesson_feedback_request', 'lesson_feedback_request', 'utility', '["student_name", "teacher_name"]',
   '[{"type": "url", "url": "https://app-staging.148-230-116-195.sslip.io/feedback/{{1}}", "text": "رأيك يهمّنا"}]',
   'السلام عليكم ورحمة الله 🌿
شكرًا لثقتكم بينا في حلقة {{1}} مع {{2}}.
رأيكم يهمنا ويساعدنا نكون أحسن — الاستمارة قصيرة ومش هتاخد دقيقة.
اضغطوا على الزر تحت وقولوا لنا رأيكم.', 'أكاديمية آيات البيان');
