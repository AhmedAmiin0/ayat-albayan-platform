-- «ابعت لينك الحلقة»: the guest link to an online classroom, sent to the guardian by WhatsApp. A
-- utility template, status not_submitted: it is submitted to Meta only by the admin's explicit
-- POST /messaging/templates/:key/submit, never automatically, and the message itself is only ever
-- an admin action (POST /lessons/:id/join-link), never a job. {{1}} student; the URL button carries
-- the one-lesson token. The host is the web app's (Meta fixes the URL at submission).
insert into public.message_templates
  (key, meta_name, category, params, buttons, body_ar, footer_ar) values
  ('lesson_join_link', 'lesson_join_link', 'utility', '["student_name"]',
   '[{"type": "url", "url": "https://app.ayatalbayan.com/join/{{1}}", "text": "ادخل الحلقة"}]',
   'السلام عليكم ورحمة الله 🌿
دي لينك دخول حلقة {{1}} أونلاين.
اضغطوا على الزر تحت وقت الحلقة، واكتبوا الاسم وادخلوا على طول — من غير تسجيل ولا برنامج.', 'أكاديمية آيات البيان')
on conflict (key) do nothing;
