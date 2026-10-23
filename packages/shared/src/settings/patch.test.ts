import { describe, expect, it } from 'vitest';
import { OWNED_SETTING_KEYS } from './ownership.js';
import { splitSettingsPatch } from './patch.js';
import { camelKey } from './camel.js';

// PATCH /settings per key (docs/26 §2f, 26-P0): owned keys are moved, never written.
describe('splitSettingsPatch', () => {
  it('writes valid registry fields as snake_case rows', () => {
    const out = splitSettingsPatch({ lateCancelHours: 24, bookingHorizonWeeks: 6, payoutCountLate: true });
    expect(out.changes).toEqual({ late_cancel_hours: 24, booking_horizon_weeks: 6, payout_count_late: true });
    expect(out.saved).toEqual(['late_cancel_hours', 'booking_horizon_weeks', 'payout_count_late']);
    expect(out).toMatchObject({ moved: [], invalid: [], issues: [] });
  });

  it('keeps null for a nullable key (turns the policy OFF) and stores the parsed (trimmed) value', () => {
    expect(splitSettingsPatch({ lateCancelHours: null }).changes).toEqual({ late_cancel_hours: null });
    expect(splitSettingsPatch({ defaultMeetingTitle: '  حلقة  ' }).changes).toEqual({ default_meeting_title: 'حلقة' });
  });

  it('moves every owned key, in camelCase and in snake_case, and writes none of them', () => {
    for (const key of Object.keys(OWNED_SETTING_KEYS)) {
      for (const field of [key, camelKey(key)]) {
        const out = splitSettingsPatch({ [field]: true });
        expect(out.moved).toEqual([key]);
        expect(out.changes).toEqual({});
        expect(out.saved).toEqual([]);
        expect(out.invalid).toEqual([]);
      }
    }
  });

  it('moves the gate, cut-over, comms_source and Google keys of an old page-wide save', () => {
    const out = splitSettingsPatch({
      messagingEnabled: true,
      autoMessagesEnabled: true,
      crmCutoverDone: true,
      commsSource: 'module',
      googleSyncEnabled: true,
      googleSyncMode: 'live',
      googleCalendarWindowDays: 30,
      messaging_enabled: true,
    });
    expect(out.moved.sort()).toEqual(
      [
        'auto_messages_enabled',
        'comms_source',
        'crm_cutover_done',
        'google_calendar_window_days',
        'google_sync_enabled',
        'google_sync_mode',
        'messaging_enabled',
      ].sort(),
    );
    expect(out.changes).toEqual({});
  });

  it('a mix: valid saved, owned moved, invalid listed with its issue, unknown ignored', () => {
    const out = splitSettingsPatch({
      bookingHorizonWeeks: 4,
      messagingEnabled: true,
      lateCancelHours: 0,
      notASetting: 1,
      booking_horizon_weeks: 2,
    });
    expect(out.changes).toEqual({ booking_horizon_weeks: 4 });
    expect(out.saved).toEqual(['booking_horizon_weeks']);
    expect(out.moved).toEqual(['messaging_enabled']);
    expect(out.invalid).toEqual(['late_cancel_hours']);
    expect(out.issues).toEqual([{ path: 'lateCancelHours', message: expect.any(String) }]);
  });

  it('names the inner path of a list issue (not_ascending keeps its wording)', () => {
    const out = splitSettingsPatch({ followUpHours: [72, 24] });
    expect(out.invalid).toEqual(['follow_up_hours']);
    expect(out.issues).toEqual([{ path: 'followUpHours', message: 'not_ascending' }]);
    expect(splitSettingsPatch({ followUpHours: [24, 'x'] }).issues[0]?.path).toBe('followUpHours.1');
  });

  it('rejects wrong types per key without touching the other keys', () => {
    const out = splitSettingsPatch({ reportingCurrency: 'sar', payoutCountLate: 'yes', renewalAlertRemaining: 3 });
    expect(out.invalid.sort()).toEqual(['payout_count_late', 'reporting_currency']);
    expect(out.changes).toEqual({ renewal_alert_remaining: 3 });
  });

  it('an empty body or prototype-like fields change nothing', () => {
    expect(splitSettingsPatch({})).toEqual({ changes: {}, saved: [], moved: [], invalid: [], issues: [] });
    const out = splitSettingsPatch(JSON.parse('{"__proto__":{"x":1},"constructor":1,"toString":2}') as Record<string, unknown>);
    expect(out).toEqual({ changes: {}, saved: [], moved: [], invalid: [], issues: [] });
  });

  it('does not repeat a key sent twice (camelCase and snake_case owned)', () => {
    expect(splitSettingsPatch({ crmCutoverDone: true, crm_cutover_done: false }).moved).toEqual(['crm_cutover_done']);
  });
});
