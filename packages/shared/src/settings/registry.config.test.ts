import { describe, expect, it } from 'vitest';
import { PUBLIC_SETTING_KEYS } from './public.js';
import { SETTING_DEFAULTS, settingDef } from './registry.js';
import { settingsChanges, settingsUpdateSchema } from './schema.js';
import { readSettings } from './validate.js';

const ok = (b: object) => settingsUpdateSchema.safeParse(b).success;

describe('custom-config settings (2026-10-05)', () => {
  it('defaults: keep recordings forever, 180 days of activity, 45-minute lessons, no consent notice', () => {
    expect(SETTING_DEFAULTS).toMatchObject({
      recording_retention_days: null,
      activity_retention_days: 180,
      default_lesson_minutes: 45,
      recording_consent_notice: null,
      academy_contact: { site: 'ayatalbayan.com', whatsapp: '+966566101447' },
    });
  });

  it('the contact and the consent notice are public; the retention and lesson settings are not', () => {
    expect(PUBLIC_SETTING_KEYS).toEqual(expect.arrayContaining(['academy_contact', 'recording_consent_notice']));
    for (const k of ['recording_retention_days', 'activity_retention_days', 'default_lesson_minutes'] as const) {
      expect(PUBLIC_SETTING_KEYS).not.toContain(k);
      expect(settingDef(k)).not.toHaveProperty('public');
    }
  });

  it.each([
    ['recordingRetentionDays', null, true],
    ['recordingRetentionDays', 30, true],
    ['recordingRetentionDays', 0, false],
    ['recordingRetentionDays', 1.5, false],
    ['activityRetentionDays', 365, true],
    ['activityRetentionDays', null, false],
    ['activityRetentionDays', 0, false],
    ['defaultLessonMinutes', 60, true],
    ['defaultLessonMinutes', 4, false],
    ['defaultLessonMinutes', 241, false],
    ['recordingConsentNotice', null, true],
    ['recordingConsentNotice', { ar: 'نص', en: 'text' }, true],
    ['recordingConsentNotice', { fr: 'x' }, false],
    ['recordingConsentNotice', 'plain', false],
    ['academyContact', { site: 'example.org', whatsapp: '+201001234567', email: 'a@b.co' }, true],
    ['academyContact', { whatsapp: '0566101447' }, false],
    ['academyContact', { email: 'nope' }, false],
    ['academyContact', { site: 'not a host' }, false],
    ['academyContact', { whatsapp: '' }, false],
    ['academyContact', null, false],
  ])('PATCH %s = %j → %s', (field, value, valid) => {
    expect(ok({ [field]: value })).toBe(valid);
  });

  it('reads stored values, and a malformed row falls back to its default', () => {
    const s = readSettings([
      { key: 'activity_retention_days', value: 30 },
      { key: 'recording_retention_days', value: 'x' },
      { key: 'academy_contact', value: { email: 'a@b.co' } },
      { key: 'recording_consent_notice', value: { ar: 'نص' } },
      { key: 'default_lesson_minutes', value: 0 },
    ]);
    expect(s).toMatchObject({
      activity_retention_days: 30,
      recording_retention_days: null,
      academy_contact: { email: 'a@b.co' },
      recording_consent_notice: { ar: 'نص' },
      default_lesson_minutes: 45,
    });
    expect(readSettings([{ key: 'academy_contact', value: { whatsapp: 'bad' } }]).academy_contact).toEqual(SETTING_DEFAULTS.academy_contact);
    expect(readSettings([{ key: 'activity_retention_days', value: 0 }]).activity_retention_days).toBe(180);
  });

  it('PATCH maps the new camelCase names to their row keys', () => {
    expect(settingsChanges({ activityRetentionDays: 90, recordingRetentionDays: null })).toEqual({
      activity_retention_days: 90,
      recording_retention_days: null,
    });
  });
});
