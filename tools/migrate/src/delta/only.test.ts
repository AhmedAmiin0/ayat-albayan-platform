// --only scoping and the skip cascade on invented plan items.
import { describe, expect, it } from 'vitest';
import { keys } from '../keys.ts';
import type { PlanItem, RowIssue } from '../types.ts';
import type { PlanWithChanges } from '../plan/changes.ts';
import { onlyEntities, parseOnly, skipUnresolvable } from './only.ts';
import { runScope } from './scope.ts';

const T = keys.teacher('rabia');
const LESSON = keys.lesson({ teacher: 'rabia', students: ['x'], at: '2026-11-01T10:00:00.000Z' });
const item = (o: Partial<PlanItem> & Pick<PlanItem, 'key'>): PlanItem => ({
  action: 'create',
  targetId: null,
  hash: 'h',
  record: { columns: {}, refs: {} },
  ref: { source: 'BOOK', tab: 't', row: 3 },
  ...o,
});
const issue = (entity: RowIssue['entity']): RowIssue => ({
  code: 'bad_phone',
  severity: 'reject',
  entity,
  ref: { source: 'HUB', tab: 't', row: 4 },
});
const planOf = (items: PlanItem[], issues: RowIssue[] = []) =>
  ({ target: 'local', createdAt: '', items, issues, counts: {}, changes: [] }) as PlanWithChanges;
const FROM = { only: parseOnly('lessons'), fromUtc: '2026-10-25T21:00:00.000Z' };

describe('onlyEntities', () => {
  it('plans every other entity as untouched and drops its issues', () => {
    const lead = item({ key: keys.lead('+966500000003') });
    const lesson = item({
      key: LESSON,
      record: { columns: { starts_at: '2026-11-01T10:00:00.000Z' }, refs: {} },
    });
    const p = onlyEntities(planOf([lead, lesson], [issue('leads'), issue('lessons')]), FROM);
    expect(p.items.map((i) => i.action)).toEqual(['skip', 'create']);
    expect(p.issues.map((i) => i.entity)).toEqual(['lessons']);
    expect(p.counts['leads']).toMatchObject({ create: 0, skip: 1 });
  });

  it('a lesson before --from is untouched even when lessons are in --only', () => {
    const past = item({
      key: keys.lesson({ teacher: 'rabia', students: ['x'], at: '2026-10-20' }),
      record: { columns: { starts_at: '2026-10-20T09:00:00.000Z' }, refs: {} },
    });
    expect(onlyEntities(planOf([past]), FROM).items[0]?.action).toBe('skip');
  });

  it('a lesson whose new teacher is left out is skipped with missing_ref', () => {
    const lesson = item({
      key: LESSON,
      record: { columns: { starts_at: '2026-11-01T10:00:00.000Z' }, refs: { teacher_id: T } },
    });
    const p = onlyEntities(planOf([item({ key: T }), lesson]), FROM);
    expect(p.items.map((i) => i.action)).toEqual(['skip', 'skip']);
    expect(p.issues).toMatchObject([
      { code: 'missing_ref', entity: 'lessons', field: 'teacher_id' },
    ]);
  });
});

describe('skipPartialParents (via onlyEntities)', () => {
  it('a new rule and lesson whose student was left out are skipped, not booked empty', () => {
    const S = keys.student({ guardianPhone: '+966500000004', name: 'ليان' });
    const RULE = keys.scheduleRule({ teacher: 'rabia', students: [S.key] });
    const only = parseOnly(
      'students,schedule_rules,schedule_rule_students,lessons,lesson_students',
    );
    const p = onlyEntities(
      planOf([
        item({ key: T, action: 'skip', targetId: 't-1' }),
        item({ key: keys.guardian('+966500000004') }), // new, but guardians are not in --only
        item({
          key: S,
          record: { columns: {}, refs: { guardian_id: keys.guardian('+966500000004') } },
        }),
        item({ key: RULE, record: { columns: {}, refs: { teacher_id: T } } }),
        item({
          key: keys.scheduleRuleStudent({ rule: RULE.key, student: S.key }),
          record: { columns: {}, refs: { rule_id: RULE, student_id: S } },
        }),
        item({
          key: LESSON,
          record: { columns: { starts_at: '2026-11-01T10:00:00.000Z' }, refs: { teacher_id: T } },
        }),
        item({
          key: keys.lessonStudent({ lesson: LESSON.key, student: S.key }),
          record: { columns: {}, refs: { lesson_id: LESSON, student_id: S } },
        }),
      ]),
      { ...FROM, only },
    );
    expect(p.items.filter((i) => i.action !== 'skip')).toEqual([]);
  });
});

describe('skipUnresolvable / parseOnly / runScope', () => {
  it('keeps records whose refs have a target row', () => {
    const lesson = item({ key: LESSON, record: { columns: {}, refs: { teacher_id: T } } });
    const p = skipUnresolvable(planOf([item({ key: T, action: 'skip', targetId: 't-1' }), lesson]));
    expect(p.items.map((i) => i.action)).toEqual(['skip', 'create']);
  });

  it('rejects unknown entity names', () => {
    expect(() => parseOnly('students,pupils')).toThrow(/pupils/);
    expect(() => parseOnly(' ')).toThrow(/--only/);
  });

  it('recreation only with --creates-only and an explicit --only; default from = today', () => {
    expect(runScope({ createsOnly: true }, '2026-10-26')).toEqual({
      build: { today: '2026-10-26', from: '2026-10-26' },
    });
    expect(
      runScope({ only: 'students', createsOnly: false }, '2026-10-26').build.recreate,
    ).toBeUndefined();
    const s = runScope({ only: 'students', createsOnly: true, from: '2026-10-27' }, '2026-10-26');
    expect(s.build.recreate?.fromUtc).toBe('2026-10-26T21:00:00.000Z');
    expect(runScope({ createsOnly: false, expiryDays: 10 }, '2026-10-26').build.expiryDays).toBe(
      10,
    );
  });
});
