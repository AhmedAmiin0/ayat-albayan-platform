import { describe, expect, it } from 'vitest';
import { pageFacts } from '@/modules/reporting/report-page/report-page.fakes';
import { maskPhone, phoneChoices, phoneOf } from './report-phones';

// Invented numbers (+1 555 range): no real phone.
describe('report code targets', () => {
  it('the family and the teacher, each masked to its last two digits', () => {
    expect(phoneChoices({ facts: pageFacts(), sent: true })).toEqual([
      { to: 'family', masked: '••••01' },
      { to: 'teacher', masked: '••••02' },
    ]);
    expect(maskPhone('+15550000099')).toBe('••••99');
  });

  it('the phone ON FILE of the target only; a missing phone is no choice', () => {
    const facts = pageFacts();
    expect(phoneOf({ facts, sent: true }, 'teacher')).toBe('+15550000002');
    const noTeacher = { ...facts, teacher: { ...facts.teacher, phone_e164: null } };
    expect(phoneChoices({ facts: noTeacher, sent: true }).map((c) => c.to)).toEqual(['family']);
  });

  it('one number for both (the teacher is the guardian): one choice', () => {
    const facts = pageFacts();
    const same = { ...facts, teacher: { ...facts.teacher, phone_e164: '+15550000001' } };
    expect(phoneChoices({ facts: same, sent: true })).toHaveLength(1);
  });

  it('before the report was sent to the family: the teacher only (never the guardian)', () => {
    const facts = pageFacts();
    expect(phoneChoices({ facts, sent: false }).map((c) => c.to)).toEqual(['teacher']);
    expect(phoneOf({ facts, sent: false }, 'family')).toBeNull();
  });

  it('a teacher no longer active gets no code (A3)', () => {
    const facts = pageFacts();
    const left = { ...facts, teacher: { ...facts.teacher, status: 'inactive' as const } };
    expect(phoneOf({ facts: left, sent: true }, 'teacher')).toBeNull();
    expect(phoneChoices({ facts: left, sent: true }).map((c) => c.to)).toEqual(['family']);
  });

  it('a lesson reassigned to another teacher: the report\'s teacher gets no code (A3)', () => {
    const facts = pageFacts();
    const moved = { ...facts, lesson: { ...facts.lesson, teacher_id: 't2' } };
    expect(phoneOf({ facts: moved, sent: true }, 'teacher')).toBeNull();
  });
});
