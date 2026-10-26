import { describe, expect, it } from 'vitest';
import { forAudience, lessonButtonSlug, lessonParams, lessonParamValue, needsLesson } from './lesson-params.js';
import type { ThreadLesson } from '../chat/views.js';

const lesson: ThreadLesson = {
  id: 'l1',
  starts_at: '2026-10-04T14:00:00Z',
  meeting_link: 'https://meet.jit.si/ab-sara-x1',
  student_names: ['سهيلة', 'مريم'],
  tz: 'Asia/Riyadh',
};

describe('lesson template variables (rule 6: never free-text times)', () => {
  it('a template with a time variable needs a lesson', () => {
    expect(needsLesson(['student_names', 'lesson_when'])).toBe(true);
    expect(needsLesson(['teacher_name', 'lesson_slot'])).toBe(true);
    expect(needsLesson(['student_name', 'remaining_label'])).toBe(false);
  });

  it('fills times in the recipient tz with the producers’ formats', () => {
    expect(lessonParamValue('lesson_when', lesson)).toBe('الأحد 4 أكتوبر 17:00');
    expect(lessonParamValue('lesson_time', lesson)).toBe('17:00');
    expect(lessonParamValue('lesson_time', { ...lesson, tz: 'Africa/Cairo' })).toBe('17:00');
    expect(lessonParamValue('lesson_time', { ...lesson, tz: 'Europe/London' })).toBe('15:00');
    expect(lessonParamValue('lesson_slot', lesson)).toBe('17:00 — سهيلة ومريم');
    expect(lessonParamValue('student_names', lesson)).toBe('سهيلة ومريم');
    expect(lessonParamValue('student_name', lesson)).toBe('سهيلة');
    expect(lessonParamValue('remaining_label', lesson)).toBeNull();
  });

  it('the button code only for a template of the same meeting host', () => {
    expect(lessonButtonSlug(lesson, 'https://meet.jit.si/{{1}}')).toBe('ab-sara-x1');
    expect(lessonButtonSlug(lesson, 'https://meet.google.com/{{1}}')).toBeNull();
    expect(lessonButtonSlug({ ...lesson, meeting_link: 'https://meet.google.com/abc-defg-hij' }, 'https://meet.google.com/{{1}}')).toBe('abc-defg-hij');
    expect(lessonButtonSlug({ ...lesson, meeting_link: null }, 'https://meet.jit.si/{{1}}')).toBeNull();
  });

  it('fills a template by its variables’ names, plus the matching meeting code', () => {
    const tpl = { params: ['student_names', 'lesson_when'], buttons: [{ type: 'url' as const, url: 'https://meet.jit.si/{{1}}' }] };
    expect(lessonParams(tpl, lesson)).toEqual({ '1': 'سهيلة ومريم', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-sara-x1' });
    expect(lessonParams({ params: ['teacher_name', 'lesson_slot'], buttons: [] }, lesson)).toEqual({ '2': '17:00 — سهيلة ومريم' });
  });

  it('teacher templates only to teachers, and only those to them', () => {
    expect(forAudience('teacher_lesson_reminder', true)).toBe(true);
    expect(forAudience('teacher_lesson_reminder', false)).toBe(false);
    expect(forAudience('booking_confirmation', false)).toBe(true);
    expect(forAudience('booking_confirmation', true)).toBe(false);
  });
});
