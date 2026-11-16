-- «إنهاء الحلقة للجميع» (owner 2026-11-16): a lesson's room ends for everyone when its teacher or an
-- admin ends it (POST /lessons/:id/end, LiveKit DeleteRoom). The stamp is what every join gate reads
-- (staff join, the portal join, the /join door, the family's signed link): 410 lesson_ended once set,
-- so «ادخل مرة أخرى» cannot reopen it. edit_lesson_time clears it (20261117000120): a new time is a
-- new session. Expand-only and idempotent: the previous API never reads or writes it.
-- RLS / grants: unchanged (a new column of lessons keeps the table's policies; only the API's
-- service role writes it).
-- MANUAL ROLLBACK: alter table public.lessons drop column if exists room_ended_at;

alter table public.lessons add column if not exists room_ended_at timestamptz;

comment on column public.lessons.room_ended_at is
  'When the teacher or an admin ended the lesson for everyone; joins answer 410 lesson_ended.';
