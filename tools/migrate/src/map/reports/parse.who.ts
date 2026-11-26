// Who a report row is about, and who taught it (pure). The student is found first (phone + name,
// else name + teacher for old phone-less rows); a teacher cell holding a city or an unknown name
// then falls back to that student's registry teacher (A3). A registry name naming several
// children (A4) is the owner's call — one child, or a group lesson — so it goes to review.
import type { Desired } from '../../plan/resolve.ts';
import { phoneCell } from '../../sources/sheets/cells.ts';
import type { IssueInput } from '../../sources/sheets/issues.ts';
import { splitSiblings } from '../../sources/sheets/siblings.ts';
import type { SourceRow } from '../../types.ts';
import { type StudentIndex, findStudent } from '../people/match.ts';
import { reportNames, reportTeacher } from './fields.ts';

export interface Who {
  student: Desired;
  teacher: string;
  issues: IssueInput[];
}

function studentOf(f: SourceRow['fields'], o: { ix: StudentIndex; teacher: string | null }) {
  const name = reportNames(f)[0] ?? null;
  const phone = phoneCell(f.phone);
  const byPhone = phone.ok ? findStudent(o.ix, { phone: phone.e164, name }) : null;
  // A2: the student id is empty on old rows, which have only a typed name and teacher.
  return byPhone?.ok ? byPhone : findStudent(o.ix, { name, teacher: o.teacher });
}

type Found = ReturnType<typeof studentOf>;

const ownTeacher = (found: Found): string | undefined =>
  found.ok ? found.student.record.refs.teacher_id?.key : undefined;

function unknownTeacher(named: string | null | undefined): IssueInput {
  const detail = named === null ? 'not_a_teacher' : 'unknown_text';
  return { code: 'unknown_teacher', severity: 'reject', field: 'teacher', detail };
}

function unmatchedStudent(f: SourceRow['fields'], reason: string): IssueInput {
  const children = splitSiblings(reportNames(f)[0] ?? '').length;
  if (children > 1)
    return {
      code: 'sibling_split',
      severity: 'review',
      field: 'student',
      detail: `report names ${children} children: owner decides (one child or a group lesson)`,
    };
  return { code: 'missing_ref', severity: 'reject', field: 'student', detail: reason };
}

const REGISTRY_TEACHER_USED: IssueInput = {
  code: 'unknown_teacher',
  severity: 'warn',
  field: 'teacher',
  detail: 'registry_teacher_used',
};

export function reportWho(f: SourceRow['fields'], ix: StudentIndex): Who | IssueInput {
  const named = reportTeacher(f);
  const found = studentOf(f, { ix, teacher: named ?? null });
  const teacher = named ?? ownTeacher(found);
  if (!teacher) return unknownTeacher(named);
  if (!found.ok) return unmatchedStudent(f, found.reason);
  const issues: IssueInput[] = named ? [] : [REGISTRY_TEACHER_USED];
  return { student: found.student, teacher, issues };
}
