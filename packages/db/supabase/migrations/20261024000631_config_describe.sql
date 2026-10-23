-- 26-P2 (docs/26 §3, §6): admin descriptions of settings rows. One RPC writes a description and its
-- «الترجمات» twin in ONE transaction, and a one-time data copy moves today's Arabic overrides of the
-- registry hint texts into settings.description. NO value is changed: inserted rows hold JSON null
-- (= unset = the default for every reader); updated rows only gain a description. No sending switch,
-- comms_source or Google row is named here (they are not in the copy list). Idempotent.

set local lock_timeout = '5s';

-- config_describe: an admin edit writes description (+ description_edited) and the ar override of the
-- row's hint key (old phones and old tabs show hints through t() + overrides, so they see it too).
-- p_text null = «أعد الوصف الأصلي»: both are cleared and the seeded text shows again. Who may edit
-- which key is decided by the API (owned keys need their module's permission); this RPC names no key.
-- A missing row is inserted with JSON null, so a description never needs a value first.
create or replace function public.config_describe(p_key text, p_text text, p_hint_key text, actor uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v bigint;
begin
  if p_text is not null and (char_length(btrim(p_text)) = 0 or char_length(p_text) > 500) then
    raise exception using errcode = '22023', message = 'invalid description', detail = p_key;
  end if;
  insert into public.settings as s (key, value, description, description_edited, updated_by)
  values (p_key, 'null'::jsonb, p_text, p_text is not null, actor)
  on conflict (key) do update set description = excluded.description,
    description_edited = excluded.description_edited, updated_by = excluded.updated_by
  returning s.version into v;
  if p_hint_key is not null then
    if p_text is null then
      delete from public.translation_overrides o where o.key = p_hint_key and o.locale = 'ar';
    else
      insert into public.translation_overrides as o (key, locale, value, updated_by, updated_at)
      values (p_hint_key, 'ar', p_text, actor, now())
      on conflict (key, locale) do update set value = excluded.value, updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
    end if;
  end if;
  return jsonb_build_object('key', p_key, 'version', v);
end;
$$;

revoke execute on function public.config_describe(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.config_describe(text, text, text, uuid) to service_role;

-- One-time copy (docs/26 §3 «A data migration»; never in the seeder, §9 #19): an existing ar override
-- of a registry hint key becomes that row's description, unless the row already has one. The list is
-- SEED_ENTRIES with a hintKey, minus the keys owned by a module route (OWNED_SETTING_KEYS);
-- config-describe.migration.test.ts pins it to the registry.
with pairs(key, hint_key) as (values
    ('quick_reply_window_hours', 'settings.hints.quickReplyWindowHours'),
    ('reminder_minutes_before', 'settings.hints.reminderMinutesBefore'),
    ('reminder_24h_enabled', 'templates.settings.reminder24hHint'),
    ('teacher_whatsapp_new_student', 'templates.settings.teacherWhatsappNewStudentHint'),
    ('teacher_whatsapp_lesson_reminder', 'templates.settings.teacherWhatsappLessonReminderHint'),
    ('reminder_lookahead_hours', 'settings.hints.reminderLookaheadHours'),
    ('follow_up_hours', 'templates.settings.followUpHoursHint'),
    ('follow_up_slots_from_hours', 'settings.hints.followUpSlotsFromHours'),
    ('follow_up_slots_to_days', 'settings.hints.followUpSlotsToDays'),
    ('feedback_rate_window_min', 'settings.hints.feedbackRateWindowMin'),
    ('booking_horizon_weeks', 'settings.hints.bookingHorizonWeeks'),
    ('makeup_window_days', 'settings.hints.makeupWindowDays'),
    ('teachers_always_available', 'settings.hints.teachersAlwaysAvailable'),
    ('join_opens_before_min', 'settings.hints.joinOpensBeforeMin'),
    ('join_closes_after_min', 'settings.hints.joinClosesAfterMin'),
    ('default_meeting_title', 'settings.hints.defaultMeetingTitle'),
    ('meeting_link_auto', 'settings.hints.meetingLinkAuto'),
    ('recording_consent_notice', 'config.recordingConsentNoticeHint'),
    ('report_teacher_edit_hours', 'settings.hints.reportTeacherEditHours'),
    ('renewal_alert_remaining', 'settings.hints.renewalAlertRemaining'),
    ('subscription_expiry_days', 'settings.hints.subscriptionExpiryDays'),
    ('flag_future_lessons_when_unpaid', 'settings.hints.flagFutureLessonsWhenUnpaid'),
    ('payout_count_late', 'settings.hints.payoutCountLate'),
    ('payout_count_no_show', 'settings.hints.payoutCountNoShow'),
    ('reporting_currency', 'settings.hints.reportingCurrency'),
    ('fx_fresh_hours', 'settings.hints.fxFreshHours'),
    ('upload_max_mb', 'settings.hints.uploadMaxMb'),
    ('academy_whatsapp_e164', 'settings.hints.academyWhatsapp'),
    ('academy_timezone', 'settings.hints.academyTimezone'),
    ('academy_contact', 'config.academyContactHint'),
    ('sales_auto_assign', 'sales.assign.autoHint'),
    ('activity_retention_days', 'config.activityRetentionDaysHint')
)
insert into public.settings as s (key, value, description, description_edited)
select p.key, 'null'::jsonb, left(o.value, 500), true
from pairs p join public.translation_overrides o on o.key = p.hint_key and o.locale = 'ar'
on conflict (key) do update set description = excluded.description, description_edited = true
where s.description is null;

-- MANUAL ROLLBACK (after the code rollback; values are untouched):
--   drop function public.config_describe(text, text, text, uuid);
--   copied descriptions may stay (nothing reads them without this code) or be cleared:
--   update public.settings set description = null, description_edited = false where description_edited;
