import { portalViewer, seesMoney } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { ChildCard } from './ChildCard';

interface Props {
  home: PortalHome;
  onOpen: (studentId: string) => void;
}

/** «أبنائي» (docs/50 §6): every child at a glance, one card each; a card opens that child. */
export function GuardianHome({ home, onOpen }: Props) {
  return (
    <section aria-label={t.portal.myChildren} className="grid gap-4">
      <h1 className="font-display text-h2 font-bold">{t.portal.myChildren}</h1>
      {home.students.map((student) => (
        <ChildCard
          key={student.id}
          student={student}
          money={seesMoney(portalViewer(home.kind, student))}
          onOpen={() => onOpen(student.id)}
        />
      ))}
    </section>
  );
}
