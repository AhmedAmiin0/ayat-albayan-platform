import { describe, expect, it } from 'vitest';
import { STUDENT_STATUSES } from '../enums/index.js';
import { familyChatViaSales } from './trial-chat.js';

describe('familyChatViaSales (trial: no direct teacher chat)', () => {
  it('only a trial student’s family goes through sales', () => {
    expect(STUDENT_STATUSES.filter(familyChatViaSales)).toEqual(['trial']);
  });

  it('pending_renewal is never a trial: the teacher keeps the family chat', () => {
    expect(familyChatViaSales('pending_renewal')).toBe(false);
  });

  it('an unknown status (not loaded yet) shows no note', () => {
    expect(familyChatViaSales(undefined)).toBe(false);
    expect(familyChatViaSales(null)).toBe(false);
  });
});
