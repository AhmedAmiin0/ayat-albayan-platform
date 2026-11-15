import { describe, expect, it } from 'vitest';
import { draftOn, draftProblem, startBody } from './pause-form';

const TODAY = '2026-10-28';

describe('pause-form', () => {
  it('starts today, open-ended, no reason', () => {
    expect(draftOn(TODAY)).toEqual({ from: TODAY, until: '', reason: '' });
    expect(draftProblem(draftOn(TODAY), TODAY)).toBeNull();
  });

  it('blocks a past or empty start and an end before the start', () => {
    expect(draftProblem({ from: '2026-10-27', until: '', reason: '' }, TODAY)).toBe('date_in_past');
    expect(draftProblem({ from: '', until: '', reason: '' }, TODAY)).toBe('date_in_past');
    expect(draftProblem({ from: '2026-11-05', until: '2026-11-01', reason: '' }, TODAY)).toBe('invalid_range');
    expect(draftProblem({ from: '2026-11-01', until: '2026-11-01', reason: '' }, TODAY)).toBeNull();
  });

  it('the body: until null when empty, the reason trimmed and only when typed', () => {
    expect(startBody({ from: TODAY, until: '', reason: '  ' })).toEqual({ fromDate: TODAY, untilDate: null });
    expect(startBody({ from: TODAY, until: '2026-11-10', reason: ' سفر ' })).toEqual({
      fromDate: TODAY,
      untilDate: '2026-11-10',
      reason: 'سفر',
    });
  });
});
