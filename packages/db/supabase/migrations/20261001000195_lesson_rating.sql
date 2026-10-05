-- «تقييم الحلقة» by WhatsApp buttons (owner 2026-10-05: «add evaluation so the chats don't get
-- closed»). A guardian's quick-reply tap is an inbound message: it reopens the 24 h customer-service
-- window, which the web link of lesson_feedback_request (migration 166) never does.
--
-- lesson_rating: a utility template, status not_submitted — submitted to Meta only by the admin's
-- explicit POST /messaging/templates/:key/submit. {{1}} student, {{2}} lesson date. Three quick
-- replies; the sender attaches «rate_<value>:<lesson id>» to each (QUICK_REPLY_INTENTS).
insert into public.message_templates
  (key, meta_name, category, params, buttons, body_ar, footer_ar) values
  ('lesson_rating', 'lesson_rating', 'utility', '["student_name", "lesson_date"]',
   '[{"type": "quick_reply", "text": "ممتازة", "intent": "rate_excellent"},
     {"type": "quick_reply", "text": "جيدة", "intent": "rate_good"},
     {"type": "quick_reply", "text": "تحتاج تحسينًا", "intent": "rate_needs_work"}]',
   'السلام عليكم ورحمة الله 🌿
كيف كانت حلقة {{1}} بتاريخ {{2}}؟ اختر تقييمك:', 'أكاديمية آيات البيان')
on conflict (key) do nothing;

-- feedback_mode: what the rating job sends after a completed lesson. 'buttons' (default) queues
-- lesson_rating automatically (still behind auto_messages_enabled and the send gate); 'link' queues
-- nothing — the admin keeps sending the web form link («ابعت طلب الرأي») by hand.
insert into public.settings (key, value) values ('feedback_mode', '"buttons"'::jsonb)
on conflict (key) do nothing;

-- A button rating lives on the same lesson_feedback row (one per lesson and student) as the web
-- form. A row made by a button tap has no link yet: token_hash may be null (unique still holds for
-- links). quick_rating is the button's answer; the form's rating (1..5) and recommend stay as they
-- were, so the teachers' averages keep counting form answers only.
create type public.feedback_quick_rating as enum ('excellent', 'good', 'needs_work');
create type public.feedback_source as enum ('web_link', 'whatsapp_button');

alter table public.lesson_feedback alter column token_hash drop not null;
alter table public.lesson_feedback
  add column source public.feedback_source not null default 'web_link',
  add column quick_rating public.feedback_quick_rating,
  add column quick_rated_at timestamptz,
  -- The inbound wamid of the tap (the webhook is idempotent on it; kept for the audit trail).
  add column quick_rating_wa_id text,
  add constraint lesson_feedback_quick_rating_check
    check ((quick_rating is null) = (quick_rated_at is null));

-- Teachers read their own rows by column (migration 166): the new answer columns join the list;
-- the wamid stays with the admin and the API.
grant select (source, quick_rating, quick_rated_at) on public.lesson_feedback to authenticated;
