import { statusParamOfKind } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { t } from '@/lib/i18n';
import { teacherLabel } from '@/lib/teacher-label';
import type { TeacherListRow } from './api';

export interface StudentCountLinkProps {
  teacher: TeacherListRow;
  kind: 'active' | 'trial';
}

const ARIA = { active: t.studentLists.activeLink, trial: t.studentLists.trialLink };
const LABEL = { active: t.studentLists.active, trial: t.studentLists.trial };

/**
 * «مشترك» / «تجريبي» count of a teacher row (owner 2026-10-12): the number opens the students list
 * filtered to that teacher and status
 * («تجريبي» = new, trial, pending_subscription). Its own click, not the row's (the row opens the profile).
 * Stacked under 640px the column head is hidden, so the kind is said before the number.
 */
export function StudentCountLink({ teacher, kind }: StudentCountLinkProps) {
  const n = kind === 'active' ? teacher.active_count : teacher.trial_count;
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden="true" className="text-ink-3 sm:hidden">{LABEL[kind]}</span>
      <Link
        to="/admin/students"
        search={{ teacher: teacher.id, status: statusParamOfKind(kind) }}
        aria-label={ARIA[kind].replace('{name}', teacherLabel(teacher)).replace('{n}', String(n))}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex min-h-11 items-center tabular-nums text-lapis hover:underline sm:min-h-0"
      >
        {n}
      </Link>
    </span>
  );
}
