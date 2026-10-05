import { describe, expect, it } from 'vitest';
import { applyStudentFilters, type FilterableQuery } from './students.filters';

type Call = [string, string, unknown];

interface Recorder extends FilterableQuery<Recorder> {
  calls: Call[];
}

/** Records each filter call in order. */
function recorder(): Recorder {
  const calls: Call[] = [];
  const q: Recorder = {
    calls,
    eq: (c, v) => (calls.push(['eq', c, v]), q),
    in: (c, v) => (calls.push(['in', c, v]), q),
    is: (c, v) => (calls.push(['is', c, v]), q),
  };
  return q;
}

const T = '11111111-1111-4111-8111-111111111111';

describe('applyStudentFilters (R-STU-01)', () => {
  it('no filter → no call', () => {
    expect(applyStudentFilters(recorder(), {}).calls).toEqual([]);
  });

  it('status chips → status in (…); teacher, program, tz → eq', () => {
    const q = applyStudentFilters(recorder(), { status: ['trial', 'active'], teacher: T, program: 'arabic', tz: 'Africa/Cairo' });
    expect(q.calls).toEqual([
      ['in', 'status', ['trial', 'active']],
      ['eq', 'teacher_id', T],
      ['eq', 'program', 'arabic'],
      ['eq', 'tz', 'Africa/Cairo'],
    ]);
  });

  it('teacher=none → teacher_id is null («بدون معلم»)', () => {
    expect(applyStudentFilters(recorder(), { teacher: 'none' }).calls).toEqual([['is', 'teacher_id', null]]);
  });

  it.each([
    ['active', 'has_package', true],
    ['none', 'has_package', false],
    ['low', 'low_balance', true],
    ['unpaid', 'package_unpaid', true],
  ] as const)('package=%s → %s = %s', (pkg, column, value) => {
    expect(applyStudentFilters(recorder(), { package: pkg }).calls).toEqual([['eq', column, value]]);
  });

  it('weekly yes / no → has_weekly true / false', () => {
    expect(applyStudentFilters(recorder(), { weekly: 'yes' }).calls).toEqual([['eq', 'has_weekly', true]]);
    expect(applyStudentFilters(recorder(), { weekly: 'no' }).calls).toEqual([['eq', 'has_weekly', false]]);
  });

  it('an empty status list is no filter', () => {
    expect(applyStudentFilters(recorder(), { status: [] }).calls).toEqual([]);
  });
});
