import { describe, expect, it } from 'vitest';
import { ALL_PUSH_KINDS, FAMILY_PUSH_KINDS } from '@ab/catalog';
import { pushReaderOf, readerMayGet } from './push-readers';

// docs/50 §4: a child student never sees a price, an amount or a payment, not even in a push.

const LESSON = [
  'lesson_rescheduled',
  'lesson_cancelled',
  'course_paused',
  'course_resumed',
] as const;
const MONEY = ['payment_due', 'payment_received', 'commission_earned'] as const;
// Everyone in the student's chat hears its messages, a child login too.
const FAMILY_NEWS = [...FAMILY_PUSH_KINDS, ...LESSON, 'channel_message' as const];

describe('pushReaderOf', () => {
  it('staff roles are staff; a guardian is family', () => {
    for (const role of ['admin', 'teacher', 'assistant', 'sales'] as const)
      expect(pushReaderOf(role, false)).toBe('staff');
    expect(pushReaderOf('guardian', false)).toBe('family');
  });

  it('a student is family only when their own contact; no role reads as a child', () => {
    expect(pushReaderOf('student', true)).toBe('family');
    expect(pushReaderOf('student', false)).toBe('child');
    expect(pushReaderOf(null, true)).toBe('child');
  });
});

describe('readerMayGet', () => {
  it('a child: the lesson and report kinds and the teacher chat, never money', () => {
    for (const kind of FAMILY_NEWS) expect(readerMayGet('child', kind)).toBe(true);
    for (const kind of MONEY) expect(readerMayGet('child', kind), kind).toBe(false);
    expect(readerMayGet('child', 'new_message')).toBe(false);
  });

  it('a family: lessons, reports, the chat and their own money news; never staff work', () => {
    for (const kind of FAMILY_NEWS) expect(readerMayGet('family', kind)).toBe(true);
    expect(readerMayGet('family', 'payment_received')).toBe(true);
    expect(readerMayGet('family', 'commission_earned')).toBe(false);
    expect(readerMayGet('family', 'new_lead')).toBe(false);
  });

  it('staff: every kind (their permissions decide)', () => {
    for (const kind of ALL_PUSH_KINDS) expect(readerMayGet('staff', kind)).toBe(true);
  });
});
