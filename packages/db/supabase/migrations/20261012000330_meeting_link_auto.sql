-- «رابط الحلقة يُنشأ تلقائيًا من المنصة» (owner, 2026-10-12: «add an option to select if meeting
-- link is auto generated or statically assigned and sent»). One academy-wide switch in
-- public.settings (registry: meeting_link_auto, section classroom, public). false = today: the
-- teacher's fixed link (or the student's / booking's own) goes out in the booking confirmation and
-- the reminders. true = the messages carry our LiveKit classroom instead, chosen when they are
-- queued: the family gets lesson_join_link (a one-lesson guest token), the teacher /classroom/<id>.
-- lessons.meeting_link is never rewritten, so turning it off again restores the fixed links.
-- No new table, column, policy or grant: settings and lesson_join_links keep their RLS (073, 181).
-- Idempotent: an existing row (an admin's choice) is never overwritten.
insert into public.settings (key, value) values ('meeting_link_auto', 'false'::jsonb)
on conflict (key) do nothing;

-- lesson_join_link (migration 182) in clear Modern Standard Arabic before it is first submitted to
-- Meta (owner, 2026-10-03: no dialect). Only while it was never submitted: a template already at
-- Meta keeps the body Meta reviewed. Same single variable ({{1}} = the student's name) and the
-- same URL button (https://app.ayatalbayan.com/join/{{1}}).
update public.message_templates
   set body_ar = 'السلام عليكم ورحمة الله 🌿
هذا رابط دخول حلقة {{1}} عبر الإنترنت.
اضغطوا الزر أدناه في موعد الحلقة، واكتبوا الاسم، ثم ادخلوا مباشرة دون تسجيل أو تثبيت أي برنامج.'
 where key = 'lesson_join_link'
   and status = 'not_submitted';
