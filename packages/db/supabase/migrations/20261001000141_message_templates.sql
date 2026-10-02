-- WhatsApp template registry (R-MSG-01, issue C1, docs/12 §2). `key` is what producers write to
-- messages.template_key; meta_name + language is what Meta knows. The health check
-- (POST /messaging/templates/health) syncs status, quality, meta_id and, for every template Meta
-- has, body_ar and buttons from Meta's own components. Submitting a template to Meta is only ever
-- an explicit admin action (POST /messaging/templates/:key/submit), never automatic.
create type public.template_status as enum
  ('not_submitted', 'pending', 'approved', 'rejected', 'paused', 'disabled', 'missing');
create type public.template_category as enum ('utility', 'marketing');

create table public.message_templates (
  key text primary key,
  meta_name text not null,
  language text not null default 'ar',
  category public.template_category not null default 'utility',
  -- null = no header; 'document' = the PDF goes in the header (report_ready).
  header_format text check (header_format in ('document')),
  body_ar text not null,
  footer_ar text,
  -- Ordered names of the body variables: params->>0 describes {{1}} (docs/12 §2).
  params jsonb not null default '[]'::jsonb check (jsonb_typeof(params) = 'array'),
  -- [{type:'url', url:'https://meet.jit.si/{{1}}'} | {type:'quick_reply', text, intent}].
  buttons jsonb not null default '[]'::jsonb check (jsonb_typeof(buttons) = 'array'),
  status public.template_status not null default 'not_submitted',
  quality text,
  meta_id text,
  last_checked_at timestamptz,
  last_error text,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (meta_name, language)
);
create trigger message_templates_updated_at before update on public.message_templates
  for each row execute function public.set_updated_at();

-- The 8 templates already approved on Meta (owner's WABA, 2026-10-02). Their bodies below are the
-- shapes we were given, not Meta's exact text: last_checked_at stays null until the first health
-- check copies Meta's body and buttons over them.
insert into public.message_templates (key, meta_name, status, params, buttons, body_ar, footer_ar) values
  ('booking_confirmation', 'booking_confirmation', 'approved', '["student_names", "lesson_when"]',
   '[{"type": "url", "url": "https://meet.jit.si/{{1}}"}]',
   'تم حجز حلقة {{1}} — {{2}}', 'أكاديمية آيات البيان'),
  ('booking_confirmation_meet', 'booking_confirmation_meet', 'approved', '["student_names", "lesson_when"]',
   '[{"type": "url", "url": "https://meet.google.com/{{1}}"}]',
   'تم حجز حلقة {{1}} — {{2}}', 'أكاديمية آيات البيان'),
  ('booking_confirmation_plain', 'booking_confirmation_plain', 'approved', '["student_names", "lesson_when"]',
   '[]', 'تم حجز حلقة {{1}} — {{2}}', 'أكاديمية آيات البيان'),
  ('lesson_reminder', 'lesson_reminder_v2', 'approved', '["student_names", "lesson_time"]',
   '[{"type": "url", "url": "https://meet.jit.si/{{1}}"}]',
   'حلقة {{1}} النهاردة — {{2}}', 'أكاديمية آيات البيان'),
  ('lesson_reminder_meet', 'lesson_reminder_meet', 'approved', '["student_names", "lesson_time"]',
   '[{"type": "url", "url": "https://meet.google.com/{{1}}"}]',
   'حلقة {{1}} النهاردة — {{2}}', 'أكاديمية آيات البيان'),
  ('lesson_reminder_plain', 'lesson_reminder_plain', 'approved', '["student_names", "lesson_time"]',
   '[]', 'حلقة {{1}} النهاردة — {{2}}', 'أكاديمية آيات البيان'),
  ('teacher_lesson_reminder', 'teacher_lesson_reminder', 'approved', '["teacher_name", "lesson_slot"]',
   '[]', 'أستاذ {{1}}، عندك حلقة {{2}}', 'أكاديمية آيات البيان'),
  ('teacher_lesson_reminder_meet', 'teacher_lesson_reminder_meet', 'approved',
   '["teacher_name", "lesson_slot"]', '[{"type": "url", "url": "https://meet.google.com/{{1}}"}]',
   'أستاذ {{1}}، عندك حلقة {{2}}', 'أكاديمية آيات البيان');

-- New definitions, not on Meta yet (status not_submitted). Variables follow what the Phase 3
-- producers already queue: report_ready {{1}} student, {{2}} lessonWhenText; renewal_due {{1}}
-- student, {{2}} the package line («فاضل حلقتين» / «الباقة خلصت»). follow_up_slots reuses today's
-- «الردود الجاهزة» follow-up (HUB sheet) minus «على Zoom» and «رد بـ 1 أو 2»; it offers a free trial,
-- so it is filed as marketing (Meta would re-file it anyway).
insert into public.message_templates
  (key, meta_name, category, header_format, params, buttons, body_ar, footer_ar) values
  ('report_ready', 'report_ready', 'utility', 'document', '["student_name", "lesson_when"]', '[]',
   'السلام عليكم ورحمة الله 🌿
ده تقرير حلقة {{1}} يوم {{2}} — فيه التسميع والحفظ الجديد والمراجعة وملاحظات الحلقة والواجب الجاي.
بارك الله فيكم على المتابعة.', 'أكاديمية آيات البيان'),
  ('renewal_due', 'renewal_due', 'utility', null, '["student_name", "remaining_label"]', '[]',
   'السلام عليكم ورحمة الله 🌿
حابين نطمّنكم على باقة {{1}}: {{2}}.
لو حابين تجددوا عشان الحلقات تفضل ماشية في مواعيدها، ابعتولنا هنا ونرتّب معاكم.', 'أكاديمية آيات البيان'),
  ('follow_up_slots', 'follow_up_slots', 'marketing', null, '["slot_1", "slot_2", "tz_city"]',
   '[{"type": "quick_reply", "text": "وقف الرسايل", "intent": "stop"}]',
   'السلام عليكم ورحمة الله 🌿
ما حبيت أثقل عليك — لسه محتفظين لك بحلقتك التجريبية المجانية.
الحلقة أونلاين، وأول حلقة تجريبية ومجانية بالكامل، وبعد كل حلقة بنبعت تقرير مفصّل عن مستوى الطالب.
متاح عندنا:
🔹 {{1}}
🔹 {{2}}
المواعيد بتوقيت {{3}}.
أي موعد أنسب؟ رد علينا هنا وأثبّت الحجز فورًا.', 'أكاديمية آيات البيان'),
  ('lesson_reminder_24h', 'lesson_reminder_24h', 'utility', null, '["student_names", "lesson_time"]',
   '[{"type": "quick_reply", "text": "تمام، هنحضر", "intent": "confirm"},
     {"type": "quick_reply", "text": "محتاجين نغيّر الميعاد", "intent": "reschedule"}]',
   'السلام عليكم ورحمة الله 🌿
تذكير: حلقة {{1}} بكرة — {{2}} إن شاء الله.
لو الميعاد مش مناسب رد علينا هنا ونظبط ميعاد تاني.', 'أكاديمية آيات البيان');

-- RLS (rule 9): admins read; only the API (service role) writes (health sync, explicit submit).
alter table public.message_templates enable row level security;
create policy message_templates_admin_read on public.message_templates for select to authenticated
  using (public.is_admin());
revoke all on public.message_templates from anon;
revoke insert, update, delete, truncate, references, trigger on public.message_templates
  from authenticated;
