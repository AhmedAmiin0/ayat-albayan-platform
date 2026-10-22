import { describe, expect, it } from 'vitest';
import { eventBody, eventDescription, eventTitle, eventWanted, isOurEvent, type EventLesson } from './event-format';

// docs/24 §1 + §2.3: the script's title/description/location, the platform marker and footer.

const LESSON: EventLesson = {
  id: 'lesson-1',
  startsAt: '2026-10-25T14:00:00+00:00',
  endsAt: '2026-10-25T14:45:00+00:00',
  status: 'confirmed',
  teacherName: 'Teacher A',
  students: [{ name: 'طالب تجربة', phone: '+966500000001' }],
  link: 'https://meet.google.com/abc-defg-hij',
  kind: 'package',
  byday: [6, 2, 4],
};

describe('event title', () => {
  it('names the student and carries the platform marker', () => {
    expect(eventTitle(LESSON)).toBe('حلقة — طالب تجربة · المنصة');
  });

  it('adds «(يحتاج تأكيد)» while the lesson is unconfirmed, and «طالب جديد» without a student', () => {
    expect(eventTitle({ ...LESSON, status: 'scheduled' })).toBe('حلقة — طالب تجربة · المنصة (يحتاج تأكيد)');
    expect(eventTitle({ ...LESSON, students: [] })).toBe('حلقة — طالب جديد · المنصة');
  });
});

describe('event description', () => {
  it('teacher copy: link, teacher, repeat, kind, status, blank line, platform footer — never the phone', () => {
    const text = eventDescription(LESSON, 'teacher');
    expect(text.split('\n')).toEqual([
      'لينك الحلقة: https://meet.google.com/abc-defg-hij',
      'المعلم/ة: Teacher A',
      'التكرار: السبت/الثلاثاء/الخميس',
      'نوع الحلقة: اشتراك',
      'الحالة: مؤكدة',
      '',
      'مربوط تلقائيًا بمنصة آيات البيان — عدّل في المنصة مش هنا.',
    ]);
    expect(text).not.toContain('+966');
  });

  it('main copy adds the student and the family phone under the link line', () => {
    const lines = eventDescription(LESSON, 'main').split('\n');
    expect(lines.slice(0, 3)).toEqual(['لينك الحلقة: https://meet.google.com/abc-defg-hij', 'الطالب: طالب تجربة', 'رقم الطالب: +966500000001']);
  });

  it('a trial says so, with no repeat line; no link means no link line', () => {
    const lines = eventDescription({ ...LESSON, kind: 'trial', link: null }, 'teacher').split('\n');
    expect(lines[0]).toBe('حلقة تجريبية — مرة واحدة بس');
    expect(lines.some((l) => l.startsWith('التكرار'))).toBe(false);
    expect(lines).toContain('نوع الحلقة: حلقة تجريبية');
  });

  it('never writes a meet.jit.si link (purgeJitsi never rewrites a platform event)', () => {
    const jitsi = { ...LESSON, link: 'https://meet.jit.si/ab-room' };
    expect(eventDescription(jitsi, 'main')).not.toContain('jit.si');
    expect(eventBody(jitsi, 'main').location).toBe('أونلاين — Zoom');
  });
});

describe('event body', () => {
  it('is one single event in Asia/Riyadh with a 30-minute popup, tagged as the platform’s', () => {
    const body = eventBody(LESSON, 'teacher');
    expect(body.start).toEqual({ dateTime: '2026-10-25T14:00:00.000Z', timeZone: 'Asia/Riyadh' });
    expect(body.end.dateTime).toBe('2026-10-25T14:45:00.000Z');
    expect(body.reminders).toEqual({ useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] });
    expect(body.extendedProperties.private).toEqual({ ab_source: 'platform', ab_lesson_id: 'lesson-1' });
    expect(body.location).toBe('https://meet.google.com/abc-defg-hij');
    expect(body).not.toHaveProperty('recurrence');
  });

  it('cancelled and moved lessons have no event; held ones keep theirs', () => {
    expect(eventWanted('cancelled_by_admin')).toBe(false);
    expect(eventWanted('cancelled_by_teacher')).toBe(false);
    expect(eventWanted('rescheduled')).toBe(false);
    expect(eventWanted('completed')).toBe(true);
    expect(eventWanted('scheduled')).toBe(true);
  });

  it('recognises only its own events', () => {
    expect(isOurEvent(eventBody(LESSON, 'main'), 'lesson-1')).toBe(true);
    expect(isOurEvent(eventBody(LESSON, 'main'), 'lesson-2')).toBe(false);
    expect(isOurEvent({ extendedProperties: { private: { ab_lesson_id: 'lesson-1' } } }, 'lesson-1')).toBe(false);
    expect(isOurEvent({}, 'lesson-1')).toBe(false);
  });
});
