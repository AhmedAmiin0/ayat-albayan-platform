import { describe, expect, it } from 'vitest';
import { fallbackText, renderTemplateBody, type RenderableTemplate } from './render.js';
import { lessonReminderTemplate, teacherReminderTemplate } from './templates.js';

const reminder: RenderableTemplate = {
  body_ar: 'حلقة {{1}} النهاردة — {{2}}',
  footer_ar: 'أكاديمية آيات البيان',
  buttons: [{ type: 'url', url: 'https://meet.jit.si/{{1}}' }],
};

describe('renderTemplateBody', () => {
  it('fills {{n}} by position', () => {
    expect(renderTemplateBody(reminder.body_ar, { '1': 'سهيلة', '2': '17:00' })).toBe(
      'حلقة سهيلة النهاردة — 17:00',
    );
  });

  it('keeps a missing {{n}} visible instead of blank', () => {
    expect(renderTemplateBody('{{1}} و {{3}}', { '1': 'أ' })).toBe('أ و {{3}}');
  });
});

describe('fallbackText (R-MSG-03 wa.me)', () => {
  it('body, the meeting link the button would open, then the footer', () => {
    expect(fallbackText({ template: reminder, params: { '1': 'سهيلة', '2': '17:00', button: 'room-1' } })).toBe(
      'حلقة سهيلة النهاردة — 17:00\n\nhttps://meet.jit.si/room-1\n\nأكاديمية آيات البيان',
    );
  });

  it('adds the signed document URL; no button param → no link line', () => {
    const report: RenderableTemplate = { body_ar: 'تقرير {{1}}', footer_ar: null, buttons: [] };
    expect(fallbackText({ template: report, params: { '1': 'سهيلة' }, documentUrl: 'https://x/r.pdf' })).toBe(
      'تقرير سهيلة\n\nhttps://x/r.pdf',
    );
    expect(fallbackText({ template: reminder, params: { '1': 'سهيلة', '2': '17:00' } })).not.toContain('https');
  });
});

describe('link variants', () => {
  it.each([
    ['https://meet.jit.si/AyatAlbayan-Abrar', 'lesson_reminder', 'teacher_lesson_reminder'],
    ['https://meet.google.com/abc-defg-hij', 'lesson_reminder_meet', 'teacher_lesson_reminder_meet'],
    ['https://us06web.zoom.us/j/123', 'lesson_reminder_plain', 'teacher_lesson_reminder'],
    [null, 'lesson_reminder_plain', 'teacher_lesson_reminder'],
  ])('%j → %s / %s', (link, guardianKey, teacherKey) => {
    expect(lessonReminderTemplate(link).key).toBe(guardianKey);
    expect(teacherReminderTemplate(link).key).toBe(teacherKey);
  });
});
