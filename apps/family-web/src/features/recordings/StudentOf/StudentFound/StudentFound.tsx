import { studentOf } from '@ab/client-core';
import { EmptyState, t } from '@ab/web-kit';
import { GoHome } from './GoHome';
import type { StudentFoundProps } from './StudentFound.types';

export function StudentFound({ home, studentId, page }: StudentFoundProps) {
  const student = studentOf(home, studentId);
  if (!student) return <EmptyState title={t.common.notFound} action={<GoHome />} />;
  return <>{page(student)}</>;
}
