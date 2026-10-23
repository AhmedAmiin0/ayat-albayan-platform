import { SETTING_DEFAULTS, type SettingsPatchResult } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_ID, rulesApp } from './test-app';

type App = Awaited<ReturnType<typeof rulesApp>>;

// docs/26 §2f + 26b m1/m3 after 23-P4: the 8 keys are owned by the rules; followUpHours writes the rule
// for a notifications.manage holder; in module mode GET /settings shows the keys as the rules say them.
describe('/settings and the notification rules', () => {
  let t: App;
  const patch = (body: object, token = 'admin') =>
    t.app.inject({ method: 'PATCH', url: '/settings', payload: body, headers: { authorization: `Bearer ${token}` } });
  beforeAll(async () => {
    t = await rulesApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.table.rows.clear();
    t.resetState();
    t.settings.write.mockClear();
  });

  it('the rule keys other than followUpHours are moved, never written', async () => {
    const res = await patch({ reminderMinutesBefore: 30, reminder24hEnabled: true, feedbackMode: 'link', bookingHorizonWeeks: 6 });
    const body: SettingsPatchResult = res.json();
    expect(res.statusCode).toBe(200);
    expect(body.moved.sort()).toEqual(['feedback_mode', 'reminder_24h_enabled', 'reminder_minutes_before']);
    expect(body.saved).toEqual(['booking_horizon_weeks']);
    expect(t.settings.write).toHaveBeenCalledTimes(1);
    expect(t.settings.write).toHaveBeenCalledWith({ booking_horizon_weeks: 6 }, ADMIN_ID);
  });

  it('followUpHours with notifications.manage: saved through the follow-up rule (legacy mirror too)', async () => {
    const res = await patch({ followUpHours: [12, 96] });
    const body: SettingsPatchResult = res.json();
    expect([res.statusCode, body.saved, body.moved]).toEqual([200, ['follow_up_hours'], []]);
    expect(t.table.rows.get('follow_up_slots')?.timing).toEqual({ hours: [12, 96], slots_from_hours: 12, slots_to_days: 7 });
    expect(t.state.follow_up_hours).toEqual([12, 96]);
    expect(body.follow_up_hours).toEqual([12, 96]);
  });

  it('followUpHours invalid with the permission: 400 with the field issue (0.2.0 shape)', async () => {
    const res = await patch({ followUpHours: [72, 24] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed', issues: [{ path: 'followUpHours', message: 'not_ascending' }] });
    expect(t.table.rows.size).toBe(0);
  });

  it('followUpHours without notifications.manage: moved, nothing written', async () => {
    const res = await patch({ followUpHours: [12, 96] }, 'lite');
    const body: SettingsPatchResult = res.json();
    expect([res.statusCode, body.saved, body.moved]).toEqual([200, [], ['follow_up_hours']]);
    expect(t.table.rows.size).toBe(0);
    expect(t.settings.write).not.toHaveBeenCalled();
  });

  it('module mode: GET /settings overlays the 8 keys from the rules, and nothing else', async () => {
    Object.assign(t.state, { comms_source: 'module', reminder_minutes_before: 60, messaging_enabled: false });
    t.table.rows.set('lesson_reminder', { key: 'lesson_reminder', enabled: true, channels: null, timing: { minutes_before: 30 }, number_id: null, updated_at: '2026-10-24T00:00:00Z', updated_by: null });
    t.table.rows.set('lesson_rating', { key: 'lesson_rating', enabled: false, channels: null, timing: null, number_id: null, updated_at: '2026-10-24T00:00:00Z', updated_by: null });
    const body = (await t.get('/settings')).json();
    expect(body).toMatchObject({ reminder_minutes_before: 30, feedback_mode: 'link', messaging_enabled: false, comms_source: 'module' });
    expect(body.follow_up_hours).toEqual(SETTING_DEFAULTS.follow_up_hours);
  });

  it('module mode: followUpHours writes the rule only; the answer shows the rule', async () => {
    t.state.comms_source = 'module';
    const body: SettingsPatchResult = (await patch({ followUpHours: [6] })).json();
    expect(body).toMatchObject({ saved: ['follow_up_hours'], follow_up_hours: [6] });
    expect(t.settings.write).not.toHaveBeenCalled();
    expect(t.state.follow_up_hours).toBeUndefined();
  });

  it('legacy mode: GET /settings is the stored settings unchanged', async () => {
    t.table.rows.set('lesson_reminder', { key: 'lesson_reminder', enabled: true, channels: null, timing: { minutes_before: 30 }, number_id: null, updated_at: '2026-10-24T00:00:00Z', updated_by: null });
    expect((await t.get('/settings')).json().reminder_minutes_before).toBe(60);
  });
});
