import { portalViewer, seesMoney } from '@ab/client-core';
import type { PortalHome, PortalKind, PortalStudent } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@ab/web-kit/display';
import { buttonVariants } from '@ab/web-kit/form';
import { t } from '@ab/web-kit/i18n';
import { PackagePanel } from '@ab/web-kit/portal';

const BACK = buttonVariants({ variant: 'secondary', size: 'sm' });

/** Back to the student's page: a guardian's /children/<id>, a student's own home. */
const BACK_TO: Readonly<Record<PortalKind, (student: PortalStudent) => ReactNode>> = {
  guardian: (student) => (
    <Link to="/children/$studentId" params={{ studentId: student.id }} className={BACK}>
      {student.name}
    </Link>
  ),
  student: () => (
    <Link to="/portal" className={BACK}>
      {t.portal.app.tabs.home}
    </Link>
  ),
};

/** The package of a student whose login sees money; else the note, and no request is made. */
function PackageOf({ home, student }: { home: PortalHome; student: PortalStudent }) {
  const money = seesMoney(portalViewer(home.kind, student));
  return (
    <section aria-labelledby="package-title" className="grid gap-4">
      <div className="justify-self-start">{BACK_TO[home.kind](student)}</div>
      <h1 id="package-title" className="font-display text-h2 font-bold">
        {money ? `${t.portal.packageTab} · ${student.name}` : student.name}
      </h1>
      {money ? <PackagePanel student={student} /> : <EmptyState title={t.portal.packageEmpty} />}
    </section>
  );
}

/**
 * «الباقة» on its own page (/package/<id>, as the family app's `package/[id]`): the package, the
 * amount due, the payments and how to pay. A child's own login never reads it (anti-goal,
 * docs/50 §4): no «الباقة» heading and no request, through a stale link too.
 */
export function PackagePage({ home, studentId }: { home: PortalHome; studentId: string }) {
  const student = home.students.find((s) => s.id === studentId);
  if (!student) return <EmptyState title={t.common.notFound} />;
  return <PackageOf home={home} student={student} />;
}
