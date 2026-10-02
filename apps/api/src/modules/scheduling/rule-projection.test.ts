import { describe, expect, it } from 'vitest';
import { generatedKey, projectRules, type ProjectedRule } from './rule-projection';

// A Cairo teacher's Sunday 17:00 rule. Cairo leaves DST on Fri 30 Oct 2026: 17:00 is 14:00Z
// before and 15:00Z after, where a Riyadh 18:00 lesson (15:00Z) now lands (issue B3).
const CAIRO: ProjectedRule = {
  id: 'rule-cairo',
  teacher_id: 't1',
  byday: [0],
  start_time_local: '17:00:00',
  duration_min: 60,
  tz: 'Africa/Cairo',
  starts_on: '2026-09-06',
  ends_on: null,
  student_ids: ['s1'],
};
const NOW = new Date('2026-09-01T09:00:00Z');
const span = (from: string, to: string) => ({ from: new Date(from), to: new Date(to) });
const base = { rules: [CAIRO], generated: new Set<string>(), teacherId: 't1', studentIds: [], now: NOW };

describe('projectRules — occurrences not generated yet count as busy (R-SCH-04, issue B3)', () => {
  it('projects the teacher rule past the DST change at its new UTC instant', () => {
    const out = projectRules({ ...base, span: span('2026-11-01T15:00:00Z', '2026-11-01T16:00:00Z') });
    expect(out.teacher.map((b) => [b.id, b.starts_at.toISOString()])).toEqual([
      ['rule-cairo', '2026-11-01T15:00:00.000Z'],
    ]);
    expect(out.students).toEqual([]);
  });

  it('skips a date the rule already holds (generated, cancelled or moved away)', () => {
    const generated = new Set([generatedKey('rule-cairo', '2026-11-01')]);
    const out = projectRules({ ...base, generated, span: span('2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z') });
    expect(out.teacher).toEqual([]);
  });

  it('reports the wanted students of a rule, not the others', () => {
    const rule = { ...CAIRO, teacher_id: 'other', student_ids: ['s1', 's2'] };
    const out = projectRules({
      ...base,
      rules: [rule],
      studentIds: ['s2'],
      span: span('2026-10-04T13:00:00Z', '2026-10-04T16:00:00Z'),
    });
    expect(out.teacher).toEqual([]);
    expect(out.students.map((b) => [b.student_id, b.starts_at.toISOString()])).toEqual([
      ['s2', '2026-10-04T14:00:00.000Z'],
    ]);
  });

  it('an occurrence starting just before the span still overlaps it', () => {
    const out = projectRules({ ...base, span: span('2026-10-04T14:30:00Z', '2026-10-04T15:30:00Z') });
    expect(out.teacher.map((b) => b.starts_at.toISOString())).toEqual(['2026-10-04T14:00:00.000Z']);
  });

  it('past occurrences are history, not busy', () => {
    const now = new Date('2026-10-05T00:00:00Z');
    const out = projectRules({ ...base, now, span: span('2026-10-04T13:00:00Z', '2026-10-04T16:00:00Z') });
    expect(out.teacher).toEqual([]);
  });

  it('respects the rule end date', () => {
    const rules = [{ ...CAIRO, ends_on: '2026-10-31' }];
    const out = projectRules({ ...base, rules, span: span('2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z') });
    expect(out.teacher).toEqual([]);
  });
});
