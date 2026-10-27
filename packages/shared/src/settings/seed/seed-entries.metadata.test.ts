import { describe, expect, it } from 'vitest';
import { OWNED_SETTING_KEYS } from '../ownership.js';
import { SETTING_KEYS, SETTINGS_REGISTRY } from '../registry.js';
import { SEED_ENTRIES } from './seed-entries.js';

const byKey = new Map(SEED_ENTRIES.map((e) => [e.key, e]));
const keysWhere = (pick: (e: (typeof SEED_ENTRIES)[number]) => boolean): string[] =>
  SEED_ENTRIES.filter(pick).map((e) => e.key).sort();

/** docs/26b §2: the «القيم» groups of the 33 CONFIG keys of docs/26 §1 + docs/30 (counts 4·4·1·5·3·1·8·4·1·2). */
const CONFIG_GROUPS: Record<string, string[]> = {
  schedule: ['booking_horizon_weeks', 'late_cancel_hours', 'makeup_window_days', 'teachers_always_available'],
  classroom: ['join_opens_before_min', 'join_closes_after_min', 'default_meeting_title', 'meeting_link_auto'],
  reports: ['report_teacher_edit_hours'],
  accounts: ['reporting_currency', 'renewal_alert_remaining', 'subscription_expiry_days', 'flag_future_lessons_when_unpaid', 'fx_fresh_hours'],
  payouts: ['payout_count_late', 'payout_count_no_show', 'payout_count_trials'],
  uploads: ['upload_max_mb'],
  academy: ['academy_whatsapp_e164', 'academy_timezone', 'academy_contact', 'recording_consent_notice', 'feedback_rate_window_min',
    'family_login_enabled', 'login_code_ttl_minutes', 'login_code_max_attempts'],
  messaging: ['quick_reply_window_hours', 'reminder_lookahead_hours', 'chat_reopen_template', 'whatsapp_calls_enabled', 'crm_media_host', 'crm_media_copy_all'],
  sales: ['sales_auto_assign', 'renewal_commission_percent'],
  retention: ['recording_retention_days', 'activity_retention_days'],
};
/** docs/26 §1: the 8 notification keys (owned by «الإشعارات» from 23-P4) and the send-gate keys. */
const NOTIFICATION_KEYS = [
  'reminder_minutes_before', 'reminder_24h_enabled', 'teacher_whatsapp_new_student', 'teacher_whatsapp_lesson_reminder',
  'follow_up_hours', 'follow_up_slots_from_hours', 'follow_up_slots_to_days', 'feedback_mode',
];
const SAFETY_KEYS = ['messaging_enabled', 'auto_messages_enabled', 'crm_cutover_done', 'comms_source'];

describe('registry metadata (docs/26 §1, §2b; owner defaults 2026-10-23)', () => {
  it('every registry entry declares module and group', () => {
    const missing = SETTING_KEYS.filter((k) => {
      const d: { module?: string; group?: string } = SETTINGS_REGISTRY[k];
      return !d.module || !d.group;
    });
    expect(missing).toEqual([]);
  });

  it('the 36 CONFIG keys (28 + chat_reopen_template + whatsapp_calls_enabled + renewal_commission_percent, docs/28, + the 3 family login keys, docs/30, + crm_media_host, crm_media_copy_all) sit in their «القيم» group, scope config', () => {
    const config = Object.values(CONFIG_GROUPS).flat();
    expect(config).toHaveLength(36);
    for (const [group, keys] of Object.entries(CONFIG_GROUPS)) expect([group, keysWhere((e) => e.group === group)]).toEqual([group, [...keys].sort()]);
    expect(keysWhere((e) => e.scope === 'config')).toEqual([...config].sort());
  });

  it('the 8 notification keys: group notifications, scope module, owned by the notification rules (23-P4)', () => {
    expect(keysWhere((e) => e.group === 'notifications')).toEqual([...NOTIFICATION_KEYS].sort());
    for (const k of NOTIFICATION_KEYS) expect(byKey.get(k)).toMatchObject({ scope: 'module', ownedBy: 'notifications' });
  });

  it('the send-gate keys: group safety, owned by their module page', () => {
    expect(keysWhere((e) => e.group === 'safety')).toEqual([...SAFETY_KEYS].sort());
  });

  it('ownership agrees with OWNED_SETTING_KEYS both ways', () => {
    for (const [key, owner] of Object.entries(OWNED_SETTING_KEYS)) expect([key, byKey.get(key)?.ownedBy]).toEqual([key, owner]);
    expect(keysWhere((e) => e.ownedBy !== null)).toEqual(Object.keys(OWNED_SETTING_KEYS).sort());
    expect(byKey.get('comms_source')?.ownedBy).toBe('communications');
    expect(byKey.get('messaging_enabled')?.ownedBy).toBe('messages_gate');
  });

  it('confirmations are exactly the owner defaults', () => {
    expect(keysWhere((e) => e.confirm === 'typed')).toEqual(['activity_retention_days', 'recording_retention_days']);
    expect(keysWhere((e) => e.confirm === 'simple')).toEqual(['family_login_enabled', 'meeting_link_auto', 'sales_auto_assign', 'teachers_always_available', 'whatsapp_calls_enabled']);
  });

  it('reachesFamilies marks what families see or receive, and only that', () => {
    for (const k of ['messaging_enabled', 'auto_messages_enabled', 'comms_source', 'academy_contact', 'academy_whatsapp_e164',
      'recording_consent_notice', 'quick_reply_window_hours', 'meeting_link_auto', 'default_meeting_title', 'feedback_mode',
      'reminder_minutes_before', 'follow_up_hours']) expect([k, byKey.get(k)?.reachesFamilies]).toEqual([k, true]);
    for (const k of ['teacher_whatsapp_new_student', 'payout_count_late', 'reporting_currency', 'activity_retention_days',
      'google_sync_enabled', 'crm_cutover_done']) expect([k, byKey.get(k)?.reachesFamilies]).toEqual([k, false]);
  });

  it('module is the domain file of the entry', () => {
    expect(byKey.get('follow_up_hours')?.module).toBe('follow_ups');
    expect(byKey.get('reminder_lookahead_hours')?.module).toBe('notifications');
    expect(byKey.get('feedback_rate_window_min')?.module).toBe('feedback');
    expect(byKey.get('recording_consent_notice')?.module).toBe('recordings');
  });
});
