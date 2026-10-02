import { describe, expect, it } from 'vitest';
import { isTeacherTemplate, TEACHER_TEMPLATE_KEYS } from './teacher-templates.js';
import { TEMPLATE_KEYS } from './templates.js';

describe('teacher templates (R-MSG-05)', () => {
  it.each(TEACHER_TEMPLATE_KEYS)('%s is allowed', (key) => expect(isTeacherTemplate(key)).toBe(true));

  it.each(['booking_confirmation', 'renewal_due', 'follow_up_slots', 'report_ready', 'teacher_lesson_reminder', 'nope'])(
    '%s stays admin or system only',
    (key) => expect(isTeacherTemplate(key)).toBe(false),
  );

  it('every allowed key is a registry key', () => {
    expect(TEACHER_TEMPLATE_KEYS.every((k) => (TEMPLATE_KEYS as readonly string[]).includes(k))).toBe(true);
  });
});
