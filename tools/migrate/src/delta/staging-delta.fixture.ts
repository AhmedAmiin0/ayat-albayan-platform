// Invented ledger + desired records shaped like staging after the 2026-10-15 clear-out: people,
// lessons and rules emptied while import_items still lists them. Ids are fake labels.
import { keyId, keys } from '../keys.ts';
import type { EntityName, Existing, NaturalKey, TargetRecord } from '../types.ts';
import type { Desired } from '../plan/resolve.ts';

const T = keys.teacher('abrar');
const G = keys.guardian('+966500000001');
const S = keys.student({ guardianPhone: '+966500000001', name: 'ليان' });
const L = keys.lead('+966500000002');
const RULE = keys.scheduleRule({ teacher: 'abrar', students: [S.key] });
const PAST = keys.lesson({ teacher: 'abrar', students: [S.key], at: '2026-09-10' });
const NEXT = keys.lesson({ teacher: 'abrar', students: [S.key], at: '2026-11-02T14:30:00.000Z' });
const link = (lesson: NaturalKey) => keys.lessonStudent({ lesson: lesson.key, student: S.key });
const nk = (entity: EntityName, key: string): NaturalKey => ({ entity, key });

const d = (key: NaturalKey, record: Partial<TargetRecord>): Desired => ({
  key,
  record: { columns: {}, refs: {}, ...record },
  hash: `h-${keyId(key)}`,
  ref: { source: 'HUB', tab: 't', row: 2 },
});

export const DESIRED: Desired[] = [
  d(T, { columns: { display_name_ar: 'أبرار' } }),
  d(G, { columns: { phone_e164: G.key } }),
  d(S, { refs: { guardian_id: G } }),
  d(L, { columns: { phone_e164: L.key } }),
  d(RULE, { columns: { starts_on: '2026-10-26' }, refs: { teacher_id: T } }),
  d(nk('schedule_rule_students', `${RULE.key}|${S.key}`), {
    refs: { rule_id: RULE, student_id: S },
  }),
  d(PAST, { columns: { starts_at: '2026-09-10T09:00:00.000Z' }, refs: { teacher_id: T } }),
  d(NEXT, { columns: { starts_at: '2026-11-02T14:30:00.000Z' }, refs: { teacher_id: T } }),
  d(link(PAST), { refs: { lesson_id: PAST, student_id: S } }),
  d(link(NEXT), { refs: { lesson_id: NEXT, student_id: S } }),
  d(keys.lessonReport({ lesson: PAST.key, student: S.key }), {
    refs: { lesson_id: PAST, student_id: S },
  }),
  d(nk('messages', 'wamid.X1'), { refs: { lead_id: L } }),
];

/** The ledger: every past record imported once; only the teacher row still exists. */
export function ledger(): Map<string, Existing> {
  const at = (key: NaturalKey, targetId: string | null) =>
    [keyId(key), { targetId, hash: `h-${keyId(key)}` }] as const;
  return new Map([
    at(T, 'teacher-1'),
    at(G, 'guardian-gone'),
    at(S, 'student-gone'),
    at(L, 'lead-gone'),
    at(PAST, 'lesson-gone'),
    at(link(PAST), null),
    at(keys.lessonReport({ lesson: PAST.key, student: S.key }), 'report-gone'),
    at(nk('messages', 'wamid.X1'), 'message-gone'),
  ]);
}

export const STAGING_ONLY =
  'guardians,students,schedule_rules,schedule_rule_students,lessons,lesson_students';
