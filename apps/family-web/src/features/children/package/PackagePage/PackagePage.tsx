import { studentOf } from '@ab/client-core';
import { EmptyState, t } from '@ab/web-kit';
import { PackageOf } from './PackageOf';
import type { PackagePageProps } from './PackagePage.types';

/** A child's own login never reads it (anti-goal, docs/50 §4), even through a stale link. */
export function PackagePage({ home, studentId }: PackagePageProps) {
  const student = studentOf(home, studentId);
  if (!student) return <EmptyState title={t.common.notFound} />;
  return <PackageOf home={home} student={student} />;
}
