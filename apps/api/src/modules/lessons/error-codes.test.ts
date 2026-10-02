import ar from '@ab/shared/i18n/ar.json';
import { describe, expect, it } from 'vitest';

// Rule 10: every domain error code the lessons / scheduling routes return (docs/10 §3 Errors)
// has an Arabic message the web and mobile apps can show by `code`. `conflict` is shown per
// kind from booking.conflict.<kind>.
const CODES = [
  'invalid_transition',
  'not_started',
  'slot_taken',
  'rule_not_active',
  'no_rule',
  'no_occurrences',
  'range_too_large',
  'teacher_not_linked',
  'date_in_past',
  'starts_before_lesson',
  'proposal_pending',
  'proposal_decided',
  'student_not_in_lesson',
];

describe('lessons.error messages in ar.json', () => {
  it('has exactly one message per error code', () => {
    expect(Object.keys(ar.lessons.error).sort()).toEqual([...CODES].sort());
  });

  it('uses Western digits only (no Arabic-Indic numerals)', () => {
    for (const msg of Object.values(ar.lessons.error)) expect(msg).not.toMatch(/[٠-٩]/);
  });
});
