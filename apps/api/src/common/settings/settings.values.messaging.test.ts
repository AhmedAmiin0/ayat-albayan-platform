import { settingsUpdateSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readSettings, SETTING_DEFAULTS, settingsChanges } from './settings.values';

describe('Phase 4 messaging settings (migration 142, docs/12 §2)', () => {
  it('defaults: follow-ups at 24 h then 72 h, reminder 60 min before, 24 h reminder and sending OFF', () => {
    expect(SETTING_DEFAULTS).toMatchObject({
      follow_up_hours: [24, 72],
      reminder_minutes_before: 60,
      reminder_24h_enabled: false,
      messaging_enabled: false,
      crm_cutover_done: false,
    });
  });

  it('the CRM cut-over flag is a boolean, false until the owner says the number moved', () => {
    expect(readSettings([{ key: 'crm_cutover_done', value: true }]).crm_cutover_done).toBe(true);
    expect(readSettings([{ key: 'crm_cutover_done', value: 'yes' }]).crm_cutover_done).toBe(false);
    expect(settingsChanges(settingsUpdateSchema.parse({ crmCutoverDone: true }))).toEqual({ crm_cutover_done: true });
  });

  it('automatic messages (migration 162): OFF by default, a boolean, PATCH autoMessagesEnabled', () => {
    expect(SETTING_DEFAULTS.auto_messages_enabled).toBe(false);
    expect(readSettings([{ key: 'auto_messages_enabled', value: true }]).auto_messages_enabled).toBe(true);
    expect(readSettings([{ key: 'auto_messages_enabled', value: 'true' }]).auto_messages_enabled).toBe(false);
    expect(settingsChanges(settingsUpdateSchema.parse({ autoMessagesEnabled: true }))).toEqual({ auto_messages_enabled: true });
    expect(settingsChanges(settingsUpdateSchema.parse({ autoMessagesEnabled: false }))).toEqual({ auto_messages_enabled: false });
    expect(settingsUpdateSchema.safeParse({ autoMessagesEnabled: 'on' }).success).toBe(false);
  });

  it('feedback_mode (migration 195): buttons by default, buttons | link only, PATCH feedbackMode', () => {
    expect(SETTING_DEFAULTS.feedback_mode).toBe('buttons');
    expect(readSettings([{ key: 'feedback_mode', value: 'link' }]).feedback_mode).toBe('link');
    expect(readSettings([{ key: 'feedback_mode', value: 'both' }]).feedback_mode).toBe('buttons');
    expect(settingsChanges(settingsUpdateSchema.parse({ feedbackMode: 'link' }))).toEqual({ feedback_mode: 'link' });
    expect(settingsUpdateSchema.safeParse({ feedbackMode: 'web' }).success).toBe(false);
  });

  it('valid stored values win', () => {
    const rows = [
      { key: 'follow_up_hours', value: [12, 48, 96] },
      { key: 'reminder_minutes_before', value: 30 },
      { key: 'reminder_24h_enabled', value: true },
      { key: 'messaging_enabled', value: true },
    ];
    expect(readSettings(rows)).toEqual({
      ...SETTING_DEFAULTS,
      follow_up_hours: [12, 48, 96],
      reminder_minutes_before: 30,
      reminder_24h_enabled: true,
      messaging_enabled: true,
    });
  });

  it.each([
    ['follow_up_hours', []],
    ['follow_up_hours', [72, 24]],
    ['follow_up_hours', [24, 24]],
    ['follow_up_hours', [0, 24]],
    ['follow_up_hours', [24.5]],
    ['follow_up_hours', 24],
    ['reminder_minutes_before', 0],
    ['messaging_enabled', 'true'],
    ['reminder_24h_enabled', 1],
  ])('malformed %s = %j reads as the default (sending stays OFF)', (key, value) => {
    expect(readSettings([{ key, value }])).toEqual(SETTING_DEFAULTS);
  });

  it('PATCH maps the camelCase fields', () => {
    const body = settingsUpdateSchema.parse({ followUpHours: [24, 72], messagingEnabled: true });
    expect(settingsChanges(body)).toEqual({ follow_up_hours: [24, 72], messaging_enabled: true });
    expect(settingsChanges({ reminderMinutesBefore: 45, reminder24hEnabled: true })).toEqual({
      reminder_minutes_before: 45,
      reminder_24h_enabled: true,
    });
  });

  it.each([
    [{ followUpHours: [72, 24] }],
    [{ followUpHours: [] }],
    [{ followUpHours: [24, 48, 72, 96, 120, 144] }],
    [{ reminderMinutesBefore: 2 }],
    [{ messagingEnabled: 'yes' }],
  ])('PATCH rejects %j', (body) => {
    expect(settingsUpdateSchema.safeParse(body).success).toBe(false);
  });
});
