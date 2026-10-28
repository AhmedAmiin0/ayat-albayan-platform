import { describe, expect, it } from 'vitest';
import { trialRows } from '../sales-students.fakes';
import { toTrialLessons } from './sales-student-trial.mapper';

const NOW = new Date('2026-10-28T12:00:00Z');

describe('toTrialLessons', () => {
  it('newest date first, a moved one kept as «نُقلت», the teacher\'s name only (no link)', () => {
    const out = toTrialLessons(trialRows(), NOW);
    expect(out).toEqual([
      { lesson_id: 't1', starts_at: '2026-09-03T15:00:00.000Z', status: 'completed', outcome: 'attended', teacher_name: 'أبرار' },
      { lesson_id: 't0', starts_at: '2026-09-01T15:00:00.000Z', status: 'rescheduled', outcome: 'moved', teacher_name: 'أبرار' },
    ]);
    expect(JSON.stringify(out)).not.toMatch(/meet|secret|created_by/);
  });

  it('a date still ahead is «قادمة»; the same lesson read twice counts once; no trial: []', () => {
    const [moved, held] = trialRows();
    const ahead = { ...held, lesson: held.lesson && { ...held.lesson, starts_at: '2026-11-01T15:00:00+00:00', status: 'scheduled' as const, teacher: null } };
    expect(toTrialLessons([moved, ahead, ahead], NOW).map((l) => [l.lesson_id, l.outcome, l.teacher_name])).toEqual([['t1', 'upcoming', null], ['t0', 'moved', 'أبرار']]);
    expect(toTrialLessons([], NOW)).toEqual([]);
  });

  it('a lesson that is no trial (a paid package lesson) is left out', () => {
    const [, held] = trialRows();
    const paid = { ...held, chargeable: true, lesson: held.lesson && { ...held.lesson, rule: { package: '8' as const } } };
    expect(toTrialLessons([paid], NOW)).toEqual([]);
  });
});
