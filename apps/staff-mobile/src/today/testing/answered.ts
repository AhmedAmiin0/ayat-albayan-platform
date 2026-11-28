import type { LessonView } from '@ab/schedule';

const hexOf = (key: string): string =>
  Array.from(key, (c) => c.charCodeAt(0).toString(16)).join('');

/** A stable uuid for a readable test id; the lesson answers are parsed strictly. */
export const uuidFor = (key: string): string =>
  `00000000-0000-4000-8000-${hexOf(key).slice(-12).padStart(12, '0')}`;

/** The lesson as the API answers a write: every id a uuid. */
export function answered(l: LessonView): LessonView {
  const asked = l.pending_proposal;
  const proposal = asked && { ...asked, id: uuidFor(asked.id) };
  return {
    ...l,
    id: uuidFor(l.id),
    rule_id: l.rule_id && uuidFor(l.rule_id),
    teacher: { ...l.teacher, id: uuidFor(l.teacher.id) },
    students: l.students.map((s) => ({ ...s, id: uuidFor(s.id) })),
    pending_proposal: proposal,
  };
}
