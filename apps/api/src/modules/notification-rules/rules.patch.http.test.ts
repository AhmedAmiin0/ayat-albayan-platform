import { ESSENTIAL_OFF_TEXT, type NotificationEntryView } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_ID, NUMBER_ID, rulesApp } from './test-app';

type App = Awaited<ReturnType<typeof rulesApp>>;
const URL = '/admin/notifications';

describe('PATCH /admin/notifications/:key (docs/23b decision 4)', () => {
  let t: App;
  beforeAll(async () => {
    t = await rulesApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.table.rows.clear();
    t.resetState();
    t.settings.write.mockClear();
    t.audit.record.mockClear();
    t.activity.push.mockClear();
  });

  it('teacher, sales and an admin-like role without notifications.manage → 403, nothing written', async () => {
    for (const token of ['teacher', 'sales', 'lite']) {
      expect((await t.patch(`${URL}/lesson_reminder_24h`, { enabled: true }, token)).statusCode).toBe(403);
    }
    expect(t.table.upsert).not.toHaveBeenCalled();
    expect(t.settings.write).not.toHaveBeenCalled();
  });

  it('unknown key → 404; manual → 422 not_editable; locked OFF → 422 locked', async () => {
    expect((await t.patch(`${URL}/nope`, { enabled: true })).statusCode).toBe(404);
    const manual = await t.patch(`${URL}/inbox_templates`, { enabled: false });
    expect([manual.statusCode, manual.json().code]).toEqual([422, 'not_editable']);
    const locked = await t.patch(`${URL}/reminder_failed`, { enabled: false });
    expect([locked.statusCode, locked.json().code]).toEqual([422, 'locked']);
    expect(t.table.rows.size).toBe(0);
  });

  it('invalid timing, timing on a non-timed row, bad channels, unknown fields → 422 invalid', async () => {
    const bodies: [string, object][] = [
      ['lesson_reminder', { timing: { minutes_before: 3 } }],
      ['lesson_reminder_24h', { timing: { send_at_local: '07:30' } }],
      ['follow_up_slots', { timing: { hours: [72, 24], slots_from_hours: 12, slots_to_days: 7 } }],
      ['report_ready', { timing: { minutes_before: 60 } }],
      ['new_lead', { channels: ['push'] }],
      ['new_lead', { channels: ['bell', 'whatsapp'] }],
      ['report_ready', { colour: 'red' }],
    ];
    for (const [key, body] of bodies) {
      const res = await t.patch(`${URL}/${key}`, body);
      expect([key, res.statusCode, res.json().code]).toEqual([key, 422, 'invalid']);
    }
    expect(t.table.rows.size).toBe(0);
  });

  it('an unknown number → 422 unknown_number; a known one is kept', async () => {
    const bad = await t.patch(`${URL}/report_ready`, { number_id: 'c0000000-0000-4000-8000-000000000009' });
    expect([bad.statusCode, bad.json().code]).toEqual([422, 'unknown_number']);
    expect((await t.patch(`${URL}/report_ready`, { number_id: NUMBER_ID })).statusCode).toBe(200);
    expect(t.table.rows.get('report_ready')?.number_id).toBe(NUMBER_ID);
  });

  it('an essential OFF needs the typed word (428), then writes, audits and logs an activity entry', async () => {
    const no = await t.patch(`${URL}/booking_confirmation`, { enabled: false });
    expect([no.statusCode, no.json().message]).toEqual([428, 'confirmation_required']);
    expect((await t.patch(`${URL}/booking_confirmation`, { enabled: false, confirmText: 'نعم' })).statusCode).toBe(428);
    expect(t.essentialOffs()).toEqual([]);
    const ok = await t.patch(`${URL}/booking_confirmation`, { enabled: false, confirmText: ` ${ESSENTIAL_OFF_TEXT} ` });
    expect(ok.statusCode).toBe(200);
    const view: NotificationEntryView = ok.json();
    expect(view).toMatchObject({ key: 'booking_confirmation', state: 'off', rule: { enabled: false, updated_by: ADMIN_ID } });
    expect(t.essentialOffs()).toEqual([expect.objectContaining({ entity: 'notification_rules', entity_id: 'booking_confirmation', actor_id: ADMIN_ID })]);
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'notification_rules', action: 'update:booking_confirmation' }));
    // Back ON needs no word.
    expect((await t.patch(`${URL}/booking_confirmation`, { enabled: true })).statusCode).toBe(200);
  });

  it('legacy mode: writes the row AND its legacy keys (parity stays empty), unspecified fields kept', async () => {
    const res = await t.patch(`${URL}/lesson_reminder_24h`, { enabled: true, timing: { send_at_local: '20:00' } });
    expect(res.statusCode).toBe(200);
    expect(t.table.rows.get('lesson_reminder_24h')).toMatchObject({ enabled: true, timing: { send_at_local: '20:00' }, channels: ['whatsapp'] });
    expect(t.settings.write).toHaveBeenCalledWith({ reminder_24h_enabled: true }, ADMIN_ID);
    await t.patch(`${URL}/follow_up_slots`, { timing: { hours: [12, 48], slots_from_hours: 6, slots_to_days: 10 } });
    expect(t.state).toMatchObject({ follow_up_hours: [12, 48], follow_up_slots_from_hours: 6, follow_up_slots_to_days: 10 });
    await t.patch(`${URL}/lesson_rating`, { enabled: false });
    expect(t.state.feedback_mode).toBe('link');
  });

  it('module mode: writes the row only; the legacy keys are frozen', async () => {
    t.state.comms_source = 'module';
    const res = await t.patch(`${URL}/lesson_reminder`, { timing: { minutes_before: 30 } });
    expect(res.statusCode).toBe(200);
    expect((res.json() as NotificationEntryView).timing?.value).toBe('30');
    expect(t.settings.write).not.toHaveBeenCalled();
    expect(t.state.reminder_minutes_before).toBeUndefined();
  });

  it('the alias PATCH /admin/communications/notifications/:key does the same, with the same guard', async () => {
    expect((await t.patch('/admin/communications/notifications/teacher_new_student', { enabled: false }, 'lite')).statusCode).toBe(403);
    const res = await t.patch('/admin/communications/notifications/teacher_new_student', { enabled: false });
    expect(res.statusCode).toBe(200);
    expect(t.state.teacher_whatsapp_new_student).toBe(false);
  });

  it('never writes a sending switch or comms_source', async () => {
    await t.patch(`${URL}/lesson_reminder_24h`, { enabled: true });
    const written = t.settings.write.mock.calls.flatMap((c) => Object.keys(c[0]));
    expect(written.filter((k) => ['messaging_enabled', 'auto_messages_enabled', 'crm_cutover_done', 'comms_source'].includes(k))).toEqual([]);
  });
});
