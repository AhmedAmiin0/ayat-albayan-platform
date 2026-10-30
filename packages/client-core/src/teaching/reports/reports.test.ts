import type { ReportView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { ApiError, reportEntryValues, reportErrorCode, reportErrorWords } from '../../index.js';

const TEXT = { errors: { version_conflict: 'conflict', missing_grades: 'grades' }, invalidTransition: 'transition', generic: 'error' };
const words = reportErrorWords(() => TEXT);

describe('report error words (docs/11 §3)', () => {
  it('reads the domain code, else the first validation issue', () => {
    expect(reportErrorCode(new ApiError(409, { code: 'version_conflict' }))).toBe('version_conflict');
    expect(reportErrorCode(new ApiError(400, { issues: [{ message: 'missing_grades' }] }))).toBe('missing_grades');
    expect(reportErrorCode(new ApiError(400, { code: 7, issues: [{ message: 'x' }] }))).toBe('x');
    expect(reportErrorCode(new ApiError(502))).toBeNull();
    expect(reportErrorCode(new TypeError('offline'))).toBeNull();
  });

  it('says a code in the injected words; unknown codes and non-API errors are the generic error', () => {
    expect(words(new ApiError(409, { code: 'version_conflict' }))).toBe('conflict');
    expect(words(new ApiError(400, { issues: [{ message: 'missing_grades' }] }))).toBe('grades');
    expect(words(new ApiError(409, { code: 'invalid_transition' }))).toBe('transition');
    expect(words(new ApiError(500, { code: 'boom' }))).toBe('error');
    expect(words(new TypeError('offline'))).toBe('error');
  });
});

describe('report entry values', () => {
  it('prefills the program from the student until the report has its own', () => {
    const report = { program: null, grades: {} } as unknown as ReportView;
    expect(reportEntryValues(report, 'quran').program).toBe('quran');
    expect(reportEntryValues({ ...report, program: 'arabic' } as ReportView, 'quran').program).toBe('arabic');
  });
});
