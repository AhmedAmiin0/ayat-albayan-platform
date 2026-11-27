import { portalViewer, seesMoney } from '@ab/client-core';
import { EmptyState, t, PackagePanel } from '@ab/web-kit';
import { BACK_TO } from './package-of.views';
import type { PackageOfProps } from './PackageOf.types';

/** The package of a student whose login sees money; else the note, and no request is made. */
export function PackageOf({ home, student }: PackageOfProps) {
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
