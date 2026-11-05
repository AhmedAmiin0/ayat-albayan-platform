import { describe, expect, it } from 'vitest';
import type { LessonStatus } from '@ab/catalog';
import { CORRECT_TO, correctionTargets } from './lesson-outcome.js';

const ENDS = '2026-11-03T16:00:00Z';
const AFTER = new Date('2026-11-03T16:01:00Z');
const BEFORE = new Date('2026-11-03T15:59:00Z');
const row = (status: LessonStatus, auto?: boolean) => ({ status, ends_at: ENDS, auto });

describe('correctionTargets («تصحيح الحالة», owner 2026-11-03)', () => {
  it('an ended open lesson offers all four', () => {
    expect(correctionTargets(row('scheduled', false), AFTER)).toEqual([...CORRECT_TO]);
    expect(correctionTargets(row('confirmed'), AFTER)).toEqual([...CORRECT_TO]);
  });

  it('an open lesson before its end offers none (cancel it instead)', () => {
    expect(correctionTargets(row('scheduled'), BEFORE)).toEqual([]);
  });

  it('a lesson the job settled offers the other three', () => {
    expect(correctionTargets(row('no_show', true), AFTER)).toEqual(['completed', 'excused', 'cancelled_by_teacher']);
    expect(correctionTargets(row('completed', true), AFTER)).toEqual(['no_show', 'excused', 'cancelled_by_teacher']);
    expect(correctionTargets(row('excused', true), AFTER)).toEqual(['completed', 'no_show', 'cancelled_by_teacher']);
  });

  it('a lesson recorded by hand or with a report offers none', () => {
    expect(correctionTargets(row('completed', false), AFTER)).toEqual([]);
    expect(correctionTargets(row('late', true), AFTER)).toEqual([]);
    expect(correctionTargets(row('cancelled_by_admin', true), AFTER)).toEqual([]);
  });

  it('unknown (a sales row): completed / no_show offered, the API decides; others none', () => {
    expect(correctionTargets(row('completed'), AFTER)).toHaveLength(3);
    expect(correctionTargets(row('no_show'), AFTER)).toHaveLength(3);
    expect(correctionTargets(row('excused'), AFTER)).toEqual([]);
  });
});
