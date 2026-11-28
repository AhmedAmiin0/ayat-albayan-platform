-- Counts the bell rows the notification page schema would refuse (docs/62 Decisions, read-only).
-- Every column it reads is not null in the database; only a push_kind the apps do not list could fail.
-- count: push_notifications_total
select count(*) from public.push_notifications;

-- count: push_notifications_unknown_kind
select count(*) from public.push_notifications
where kind::text not in (
  'new_lead', 'new_message', 'lesson_needs_confirmation', 'report_submitted', 'reminder_failed',
  'payment_due', 'new_student', 'meeting_invite', 'google_sync_alert', 'channel_message',
  'commission_earned', 'lesson_rescheduled', 'lesson_cancelled', 'course_paused', 'course_resumed',
  'payment_received', 'lesson_starting', 'report_sent', 'lesson_live', 'lesson_request_declined'
);
