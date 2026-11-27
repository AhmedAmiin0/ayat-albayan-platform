import { portalViewer, readsOwn } from '@ab/client-core';
import { t } from '@ab/web-kit';
import { Reports } from './Reports';
import type { StudentReportsPageProps } from './StudentReportsPage.types';

/** Sent reports only, newest first, grouped by month. */
export function StudentReportsPage({ student, kind }: StudentReportsPageProps) {
  const own = readsOwn(portalViewer(kind, student));
  return (
    <section aria-labelledby="reports-title" className="grid gap-4">
      <h1 id="reports-title" className="font-display text-h2 font-bold">
        {own ? t.portal.app.reports.title : t.portal.app.tabs.reports}
      </h1>
      <Reports student={student} />
    </section>
  );
}
