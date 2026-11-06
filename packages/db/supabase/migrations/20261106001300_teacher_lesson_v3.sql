-- teacher_lesson_v3 (owner 2026-11-06): the teacher's lesson notice with two link buttons on our own
-- domains, for the same-day teacher reminder and the new-student alert. UTILITY, ar, notifications
-- line, positional {{1}}…{{6}}: the teacher, the students, their codes, the time in the teacher's tz,
-- the duration and the meeting link (written in the text as well). Buttons: «ادخل الحلقة» → GET
-- /join/<signed token> (a 302 to the lesson's own room) and «تقرير الحلقة» → the no-login report page
-- (the report link is a button only). samples / buttons[].example are Meta's review examples.
-- Status not_submitted: the admin submits it from «القوالب» («إرسال إلى ميتا»); the API sends it only
-- once approved and keeps the older templates until then (packages/shared teacher-lesson-v3.ts holds
-- the same row; a test pins the two together).
-- RLS / grants: unchanged (message_templates, migration 141). Idempotent: an existing row is kept.

insert into public.message_templates
  (key, meta_name, category, line, language, status, params, samples, buttons, body_ar, footer_ar)
values
  ('teacher_lesson_v3', 'teacher_lesson_v3', 'utility', 'notifications', 'ar', 'not_submitted',
   '["teacher_name", "student_names", "student_codes", "lesson_when", "lesson_duration", "meeting_url"]'::jsonb,
   '["أبرار", "سهيلة ومريم", "AB-0101، AB-0102", "الأحد 8 نوفمبر 5:00 م", "30 دقيقة", "https://meet.google.com/abc-defg-hij"]'::jsonb,
   '[{"type": "url", "text": "ادخل الحلقة", "url": "https://api.ayatalbayan.com/join/{{1}}", "example": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.BBBBBBBBBBBBBBBBBBBBBB"}, {"type": "url", "text": "تقرير الحلقة", "url": "https://app.ayatalbayan.com/teacher-report/{{1}}", "example": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.BBBBBBBBBBBBBBBBBBBBBB"}]'::jsonb,
   'السلام عليكم ورحمة الله وبركاته
الأستاذ/ة {{1}}، تحية طيبة من أكاديمية آيات البيان.
لديك حلقة مع: {{2}}
كود الطالب: {{3}}
الموعد بتوقيتك: {{4}}
مدة الحلقة: {{5}}
رابط الحلقة: {{6}}
نرجو الدخول قبل الموعد بخمس دقائق عبر زر «ادخل الحلقة»، وتسجيل تقرير الحلقة بعد انتهائها عبر زر «تقرير الحلقة».
وإذا طرأ ما يمنعك من حضور الحلقة، فنرجو الرد على هذه الرسالة.',
   'أكاديمية آيات البيان')
on conflict (key) do nothing;

-- MANUAL ROLLBACK (only after the code rollback):
--   delete from public.message_templates where key = 'teacher_lesson_v3' and status = 'not_submitted';
