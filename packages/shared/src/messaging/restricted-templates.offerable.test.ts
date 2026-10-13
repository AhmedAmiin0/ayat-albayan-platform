import { describe, expect, it } from 'vitest';
import { OWN_BUTTON_TEMPLATES, restrictedMay, restrictedOfferable, type RestrictedCheck } from './restricted-templates.js';
import { isLessonTimed, TEMPLATE_KEYS } from './templates.js';

// Owner 2026-10-13 («just don't list them, don't disable them»): a booking confirmation or a lesson
// reminder (isLessonTimed, sent by the system) is never on the restricted allow-list, whatever its flag.

const LESSON_TIMED = [
  'booking_confirmation',
  'booking_confirmation_meet',
  'booking_confirmation_plain',
  'lesson_reminder',
  'lesson_reminder_meet',
  'lesson_reminder_plain',
  'teacher_lesson_reminder',
  'teacher_lesson_reminder_meet',
  'lesson_reminder_24h',
  'lesson_join_link',
  'teacher_new_student',
];
const OFFERED = ['free_trial_invite', 'welcome_greeting', 'renewal_due', 'follow_up_slots', 'academy_welcome'];

const flagged = (key: string, over: Partial<RestrictedCheck> = {}): RestrictedCheck => ({
  key,
  status: 'approved',
  sales_starter: true,
  header_format: null,
  ...over,
});

describe('restrictedOfferable: what the admin may offer to the restricted roles', () => {
  it('the lesson-timed registry keys are exactly the booking confirmations and reminders', () => {
    expect(TEMPLATE_KEYS.filter((k) => isLessonTimed(k))).toEqual(LESSON_TIMED);
  });

  it.each(LESSON_TIMED)('%s is never offerable, and refused even when approved and flagged', (key) => {
    expect(restrictedOfferable({ key, header_format: null })).toBe(false);
    expect(restrictedMay(flagged(key))).toBe(false);
  });

  it.each(OFFERED)('%s is offerable, and allowed once approved and flagged', (key) => {
    expect(restrictedOfferable({ key, header_format: null })).toBe(true);
    expect(restrictedMay(flagged(key))).toBe(true);
  });

  it('a PDF template (report_ready) is never offerable, flagged or not', () => {
    expect(restrictedOfferable({ key: 'report_ready', header_format: 'document' })).toBe(false);
    expect(restrictedMay(flagged('report_ready', { header_format: 'document' }))).toBe(false);
  });

  it.each(OWN_BUTTON_TEMPLATES)('%s (own button) is never offerable', (key) => {
    expect(restrictedOfferable({ key, header_format: null })).toBe(false);
    expect(restrictedMay(flagged(key))).toBe(false);
  });

  it('offerable ignores approval and the flag: the admin may tick a pending row ahead of approval', () => {
    expect(restrictedOfferable({ key: 'renewal_due', header_format: null })).toBe(true);
    expect(restrictedMay(flagged('renewal_due', { status: 'pending' }))).toBe(false);
    expect(restrictedMay(flagged('renewal_due', { sales_starter: false }))).toBe(false);
  });
});
