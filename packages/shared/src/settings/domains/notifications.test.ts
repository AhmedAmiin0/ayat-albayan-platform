import { describe, expect, it } from 'vitest';
import { settingSection } from '../layout.js';
import { SETTING_DEFAULTS, SETTING_FIELD_OF, SETTINGS_REGISTRY } from '../registry.js';
import { NOTIFICATION_SETTINGS } from './notifications.js';

// R-NOT-03 (owner 2026-10-12): the teacher's WhatsApp messages can be switched off in /admin/settings.
describe('teacher WhatsApp switches', () => {
  it('are bool messaging fields shown in the generic form, ON by default (migration 382 seeds true)', () => {
    for (const key of ['teacher_whatsapp_new_student', 'teacher_whatsapp_lesson_reminder'] as const) {
      const def = SETTINGS_REGISTRY[key];
      expect(def).toMatchObject({ type: 'bool', default: true });
      expect(settingSection(key)).toBe('messaging');
      expect('form' in def).toBe(false);
      expect(SETTING_DEFAULTS[key]).toBe(true);
    }
    expect(SETTING_FIELD_OF.teacher_whatsapp_new_student).toBe('teacherWhatsappNewStudent');
    expect(SETTING_FIELD_OF.teacher_whatsapp_lesson_reminder).toBe('teacherWhatsappLessonReminder');
  });

  it('the notifications domain owns the reminders and the teacher switches', () => {
    expect(Object.keys(NOTIFICATION_SETTINGS)).toEqual([
      'reminder_minutes_before',
      'reminder_24h_enabled',
      'teacher_whatsapp_new_student',
      'teacher_whatsapp_lesson_reminder',
      'reminder_lookahead_hours',
    ]);
  });
});
