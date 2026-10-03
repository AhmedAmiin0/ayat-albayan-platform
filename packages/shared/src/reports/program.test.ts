import { describe, expect, it } from 'vitest';
import { draftBody, submitProblem, valuesOf, type FormValues } from './form-values.js';
import { reportDraftSchema, reportSubmitSchema } from './schema.js';
import type { ReportView } from './views.js';

// «البرنامج *» on «تقرير الحلقة» (docs/13-forms-spec.md form 2).
const GRADES = { recitation: 'good', memorization: 'good', revision: 'good', tajweed: 'good', engagement: 'good', commitment: 'good' } as const;
const FULL: FormValues = {
  attendance: 'on_time',
  program: 'quran',
  recited: 'أ',
  newMemorization: 'ب',
  revision: 'ج',
  theory: '',
  grades: GRADES,
  overall: 'good',
  notes: 'ن',
  homework: 'و',
  nextPlan: '',
};

describe('report program', () => {
  it('the draft and the submit accept the three programs of the form, and nothing else', () => {
    for (const program of ['quran', 'arabic', 'islamic_studies']) {
      expect(reportDraftSchema.safeParse({ program }).success).toBe(true);
    }
    expect(reportDraftSchema.safeParse({ program: 'maths' }).success).toBe(false);
    expect(reportDraftSchema.safeParse({ program: null }).success).toBe(false);
    expect(reportSubmitSchema.safeParse({ ...draftBody(FULL), expectedVersion: 0 }).success).toBe(true);
  });

  it('leaving it out is fine on the wire (the server keeps the stored one)', () => {
    expect(reportDraftSchema.parse({})).not.toHaveProperty('program');
  });

  it('the form sends the program only once it has one', () => {
    expect(draftBody(FULL).program).toBe('quran');
    expect(draftBody({ ...FULL, program: null })).not.toHaveProperty('program');
  });

  it('valuesOf prefills it from the report', () => {
    const view = { attendance: null, program: 'arabic', grades: {} } as unknown as ReportView;
    expect(valuesOf(view).program).toBe('arabic');
    expect(valuesOf({ ...view, program: null }).program).toBeNull();
  });

  it('a form without a program is not ready to send (missing_program), after the other checks', () => {
    expect(submitProblem(FULL)).toBeNull();
    expect(submitProblem({ ...FULL, program: null })).toBe('missing_program');
    expect(submitProblem({ ...FULL, program: null, attendance: null })).toBe('missing_attendance');
    expect(submitProblem({ ...FULL, program: null, overall: null })).toBe('missing_grades');
  });
});
