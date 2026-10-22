import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import en from '../../i18n/en.json' with { type: 'json' };
import { PUSH_KINDS } from '../enums/index.js';
import { TEMPLATE_KEYS } from '../messaging/templates.js';
import { SETTING_DEFAULTS } from '../settings/index.js';
import { NOTIFICATION_CATALOGUE, NOTIFICATION_KEYS, notificationEntry } from './catalogue.js';

// Catalogue drift (docs/23 §4): a producer added without a catalogue row would be ungoverned.

describe('NOTIFICATION_CATALOGUE is complete', () => {
  it('every template a producer may queue (TEMPLATE_KEYS) belongs to at least one row', () => {
    const covered = new Set(NOTIFICATION_CATALOGUE.flatMap((e) => [...e.templates]));
    expect(TEMPLATE_KEYS.filter((k) => !covered.has(k))).toEqual([]);
  });

  it('every push_kind has exactly one bell / push row', () => {
    for (const kind of PUSH_KINDS) {
      const rows = NOTIFICATION_CATALOGUE.filter((e) => 'pushKind' in e && e.pushKind === kind);
      expect(rows.map((r) => r.key), kind).toEqual([kind]);
    }
  });

  it('keys are unique and look up their own row', () => {
    expect(new Set(NOTIFICATION_KEYS).size).toBe(NOTIFICATION_KEYS.length);
    expect(notificationEntry('report_ready').essential).toBe(true);
  });

  it('every row has a name and a trigger in Arabic and English', () => {
    for (const key of NOTIFICATION_KEYS) {
      for (const bundle of [ar, en]) {
        const words: Record<string, { name: string; trigger: string }> = bundle.notificationCatalogue.entries;
        expect(words[key]?.name, key).toBeTruthy();
        expect(words[key]?.trigger, key).toBeTruthy();
      }
    }
  });
});

describe('NOTIFICATION_CATALOGUE matches today', () => {
  it('a row with its own switch defaults to what that setting does on a fresh install', () => {
    for (const e of NOTIFICATION_CATALOGUE) {
      if ('rowSwitch' in e) expect(e.rowSwitch.isOn(SETTING_DEFAULTS), e.key).toBe(e.defaults.enabled);
      else expect(e.defaults.enabled, e.key).toBe(true);
    }
  });

  it('automatic = the sender’s AUTOMATIC_KEYS rows (reminders, join link, follow-ups, renewal, rating)', () => {
    const auto = NOTIFICATION_CATALOGUE.filter((e) => e.automatic).map((e) => e.key);
    expect(auto).toEqual([
      'lesson_reminder', 'lesson_reminder_24h', 'teacher_lesson_reminder', 'lesson_join_link',
      'renewal_due', 'follow_up_slots', 'lesson_rating',
    ]);
  });

  it('essential = booking confirmations and the report PDF; locked = the failed-send alert only', () => {
    expect(NOTIFICATION_CATALOGUE.filter((e) => e.essential).map((e) => e.key)).toEqual(['booking_confirmation', 'report_ready']);
    expect(NOTIFICATION_CATALOGUE.filter((e) => e.locked).map((e) => e.key)).toEqual(['reminder_failed']);
  });

  it('hand sends are WhatsApp only and never automatic; staff rows never use WhatsApp', () => {
    for (const e of NOTIFICATION_CATALOGUE) {
      if (e.manual) expect([e.automatic, [...e.channels]], e.key).toEqual([false, ['whatsapp']]);
      if (e.audience === 'staff') expect(e.channels, e.key).not.toContain('whatsapp');
    }
  });
});
