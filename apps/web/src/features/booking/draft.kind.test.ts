import type { BookingTeacherOption } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { emptyDraft, stepReady, stepsFor, toBookingRequest, type BookingDraft } from './draft';
import { kindPatch } from './draft.kind';

const TEACHER: BookingTeacherOption = {
  id: '6f1c2a3e-1b2c-4d5e-8f90-123456789abc',
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: null,
  students_count: 3,
  max_students: 10,
  has_availability: true,
};
const STUDENT = { id: '0b5e7d1a-2c3d-4e5f-9a8b-7c6d5e4f3a2b', name: 'سهيلة', code: 'AB-0183' };
const SISTER = { id: '1c6f8e2b-3d4e-4f5a-8b9c-8d7e6f5a4b3c', name: 'جود', code: 'AB-0184' };
const SLOT = '2026-10-04T14:00:00.000Z';
const MISSED = { lessonId: 'l-missed', startsAt: '2026-09-27T14:00:00.000Z', teacherId: TEACHER.id, durationMin: 60 } as const;
const UPLOAD = { source: 'upload', path: 'req/a.png', name: 'a.png', mime: 'image/png', preview: null } as const;
const CHAT = { source: 'whatsapp', messageId: 'm-1', mime: 'application/pdf', preview: null } as const;

const ready = (o: Partial<BookingDraft> = {}): BookingDraft => ({
  ...emptyDraft(),
  students: [STUDENT],
  tz: 'Asia/Riyadh',
  teacher: TEACHER,
  startsAt: SLOT,
  ...o,
});

describe('the steps of each booking type (R-SCH-10, R-PAY-03)', () => {
  it('a trial has no invoice, a makeup picks the missed lesson instead of a package', () => {
    expect(stepsFor('trial')).toEqual(['students', 'teacher', 'package', 'slot', 'review']);
    expect(stepsFor('package')).toEqual(['students', 'teacher', 'package', 'slot', 'invoice', 'review']);
    expect(stepsFor('makeup')).toEqual(['students', 'missed', 'teacher', 'slot', 'invoice', 'review']);
  });

  it('emptyDraft: the trial presets the trial package, anything else 8; default is a subscription', () => {
    expect(emptyDraft().kind).toBe('package');
    expect(emptyDraft({ kind: 'trial' })).toMatchObject({ kind: 'trial', pkg: 'trial' });
    expect(emptyDraft({ trial: true })).toMatchObject({ kind: 'trial', pkg: 'trial' });
    expect(emptyDraft({ kind: 'makeup' })).toMatchObject({ kind: 'makeup', pkg: '8', invoice: null, missed: null });
  });
});

describe('kindPatch', () => {
  it('changing the type resets the package, the missed lesson, the invoice and the slot', () => {
    const d = ready({ pkg: '12', extra: ['2026-10-07T14:00:00.000Z'], invoice: UPLOAD, missed: MISSED });
    expect(kindPatch(d, 'trial')).toMatchObject({ kind: 'trial', pkg: 'trial', missed: null, invoice: null, startsAt: null, extra: [] });
    expect(kindPatch(d, 'package')).toEqual({});
    expect(kindPatch(ready({ kind: 'trial', pkg: 'trial' }), 'package')).toMatchObject({ kind: 'package', pkg: '8' });
  });

  it('a makeup is for one student: the siblings drop out', () => {
    expect(kindPatch(ready({ students: [STUDENT, SISTER] }), 'makeup').students).toEqual([STUDENT]);
    expect(kindPatch(ready({ students: [STUDENT, SISTER] }), 'trial')).not.toHaveProperty('students');
  });
});

describe('stepReady for the new steps', () => {
  it('the missed lesson step needs a pick, the invoice step an invoice', () => {
    expect(stepReady(ready({ kind: 'makeup' }), 'missed')).toBe(false);
    expect(stepReady(ready({ kind: 'makeup', missed: MISSED }), 'missed')).toBe(true);
    expect(stepReady(ready(), 'invoice')).toBe(false);
    expect(stepReady(ready({ invoice: UPLOAD }), 'invoice')).toBe(true);
    expect(stepReady(ready({ invoice: CHAT }), 'invoice')).toBe(true);
  });

  it('a makeup needs exactly one existing student, never the lead path', () => {
    expect(stepReady(ready({ kind: 'makeup', students: [STUDENT, SISTER] }), 'students')).toBe(false);
    expect(stepReady(ready({ kind: 'makeup', students: [] }), 'students')).toBe(false);
    expect(stepReady(ready({ kind: 'makeup', leadId: 'l1' }), 'students')).toBe(false);
    expect(stepReady(ready({ kind: 'makeup' }), 'students')).toBe(true);
  });
});

describe('toBookingRequest per type', () => {
  it('a trial sends kind and package trial, and never an invoice', () => {
    const body = toBookingRequest(ready({ kind: 'trial', pkg: 'trial', invoice: UPLOAD }));
    expect(body).toMatchObject({ kind: 'trial', package: 'trial', byday: [0] });
    expect(body).not.toHaveProperty('invoice');
  });

  it('a subscription sends the invoice by source: an uploaded path or a chat message', () => {
    expect(toBookingRequest(ready({ invoice: UPLOAD }))).toMatchObject({
      kind: 'package',
      package: '8',
      invoice: { source: 'upload', path: 'req/a.png' },
    });
    const chat = toBookingRequest(ready({ invoice: CHAT }));
    expect(chat).toMatchObject({ invoice: { source: 'whatsapp', messageId: 'm-1' } });
    expect(chat?.invoice).not.toHaveProperty('path');
    expect(toBookingRequest(ready())).not.toHaveProperty('invoice');
  });

  it('a makeup sends the missed lesson, no package, one weekday and no lead', () => {
    const body = toBookingRequest(ready({ kind: 'makeup', missed: MISSED, extra: ['2026-10-06T14:00:00.000Z'], leadId: null, invoice: CHAT }));
    expect(body).toMatchObject({ kind: 'makeup', makeupOfLessonId: 'l-missed', studentIds: [STUDENT.id], byday: [0] });
    expect(body).not.toHaveProperty('package');
    expect(body).not.toHaveProperty('leadId');
    expect(toBookingRequest(ready({ kind: 'makeup', missed: null }))).toBeNull();
  });
});
