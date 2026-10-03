import { describe, expect, it } from 'vitest';
import { submitProblem, textRequired, type FormValues } from './form-values.js';
import { reportSubmitSchema } from './schema.js';

const grades = { recitation: 'good', memorization: 'good', revision: 'good', tajweed: 'good', engagement: 'good', commitment: 'good' } as const;
const base = { attendance: 'on_time', grades, overall: 'good', recited: 'الفاتحة', newMemorization: 'x', revision: 'y' };

describe('required text only until the first send (a legacy report can still be corrected)', () => {
  it('first send: blank notes / homework → missing_text', () => {
    const r = reportSubmitSchema.safeParse({ ...base, expectedVersion: 0 });
    expect(r.error?.issues[0]?.message).toBe('missing_text');
  });

  it('a sent report (version 1+) saves with blank notes and homework', () => {
    expect(reportSubmitSchema.safeParse({ ...base, expectedVersion: 1 }).success).toBe(true);
  });

  it('the client rule matches: marks and problem disappear after the first send', () => {
    const v: FormValues = { ...base, program: 'quran', attendance: 'on_time', grades: { ...grades }, theory: '', notes: '', homework: '', nextPlan: '', overall: 'good' };
    expect(submitProblem(v, 0)).toBe('missing_text');
    expect(submitProblem(v, 1)).toBeNull();
    expect(textRequired('notes', 'on_time', 0)).toBe(true);
    expect(textRequired('notes', 'on_time', 2)).toBe(false);
  });
});
