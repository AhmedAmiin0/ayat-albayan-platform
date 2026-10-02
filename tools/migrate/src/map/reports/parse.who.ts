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
  const phone = phoneCell(f['phone']);
  const byPhone = phone.ok ? findStudent(o.ix, { phone: phone.e164, name }) : null;
  // A2: «معرّف الطالب» is empty on old rows — they have a typed name and teacher only.
  return byPhone?.ok ? byPhone : findStudent(o.ix, { name, teacher: o.teacher });
}

export function reportWho(f: SourceRow['fields'], ix: StudentIndex): Who | IssueInput {
  const named = reportTeacher(f);
  const found = studentOf(f, { ix, teacher: named ?? null });
  const own = found.ok ? found.student.record.refs['teacher_id']?.key : undefined;
  const teacher = named ?? own;
  if (!teacher) {
    const detail = named === null ? 'not_a_teacher' : 'unknown_text';
    return { code: 'unknown_teacher', severity: 'reject', field: 'teacher', detail };
  }
  if (!found.ok) {
    const children = splitSiblings(reportNames(f)[0] ?? '').length;
    if (children > 1)
      return {
        code: 'sibling_split',
        severity: 'review',
        field: 'student',
        detail: `report names ${children} children: owner decides (one child or a group lesson)`,
      };
    return { code: 'missing_ref', severity: 'reject', field: 'student', detail: found.reason };
  }
  const issues: IssueInput[] = named
    ? []
    : [
        {
          code: 'unknown_teacher',
          severity: 'warn',
          field: 'teacher',
          detail: 'registry_teacher_used',
        },
      ];
  return { student: found.student, teacher, issues };
}
