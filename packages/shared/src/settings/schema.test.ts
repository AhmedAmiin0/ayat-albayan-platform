import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS, SETTING_FIELD_OF, SETTING_KEYS } from './registry.js';
import { settingsChanges, settingsUpdateSchema, settingZod } from './schema.js';

const ok = (body: object) => settingsUpdateSchema.safeParse(body).success;

describe('settingsUpdateSchema (generated from the registry)', () => {
  it('accepts every default under its camelCase field', () => {
    const body = Object.fromEntries(SETTING_KEYS.map((k) => [SETTING_FIELD_OF[k], SETTING_DEFAULTS[k]]));
    expect(settingsUpdateSchema.safeParse(body).success).toBe(true);
  });

  it.each([
    [{ joinOpensBeforeMin: 0 }, true],
    [{ joinOpensBeforeMin: 181 }, false],
    [{ joinClosesAfterMin: -1 }, false],
    [{ makeupWindowDays: 365 }, true],
    [{ makeupWindowDays: 0 }, false],
    [{ uploadMaxMb: 11 }, false],
    [{ uploadMaxMb: 2.5 }, false],
    [{ reminderLookaheadHours: 24 }, false],
    [{ quickReplyWindowHours: 168 }, true],
    [{ lateCancelHours: null }, true],
    [{ lateCancelHours: 0 }, false],
    [{ bookingHorizonWeeks: 13 }, false],
    [{ followUpHours: [72, 24] }, false],
    [{ feedbackMode: 'web' }, false],
  ])('%j → %s (min/max, nullable, enum)', (body, valid) => {
    expect(ok(body)).toBe(valid);
  });

  it('the academy WhatsApp must be E.164', () => {
    expect(ok({ academyWhatsappE164: '+201001234567' })).toBe(true);
    expect(ok({ academyWhatsappE164: '0566101447' })).toBe(false);
    expect(ok({ academyWhatsappE164: '+0123' })).toBe(false);
  });

  it('time zone must be IANA; the meeting title is trimmed and 1–60 characters', () => {
    expect(ok({ academyTimezone: 'Africa/Cairo' })).toBe(true);
    expect(ok({ academyTimezone: 'Mars/Base' })).toBe(false);
    expect(settingsUpdateSchema.parse({ defaultMeetingTitle: '  تنسيق ' })).toEqual({ defaultMeetingTitle: 'تنسيق' });
    expect(ok({ defaultMeetingTitle: '   ' })).toBe(false);
    expect(ok({ defaultMeetingTitle: 'x'.repeat(61) })).toBe(false);
  });

  it('a non-ascending list keeps its named message', () => {
    const r = settingsUpdateSchema.safeParse({ followUpHours: [24, 24] });
    expect(r.success ? null : r.error.issues[0]?.message).toBe('not_ascending');
  });

  it('settingZod builds one field', () => {
    expect(settingZod({ section: 'schedule', type: 'int', default: 1, min: 1, max: 2, labelKey: 'x' }).safeParse(3).success).toBe(false);
  });

  it('settingsChanges maps camelCase → snake_case, only the sent keys', () => {
    expect(settingsChanges({ joinOpensBeforeMin: 30, lateCancelHours: null, academyWhatsappE164: '+966500000000' })).toEqual({
      join_opens_before_min: 30,
      late_cancel_hours: null,
      academy_whatsapp_e164: '+966500000000',
    });
    expect(settingsChanges({})).toEqual({});
  });
});
