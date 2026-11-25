import { portalViewer, seesMoney } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { t } from '@ab/web-kit';
import { ChildCard } from '@ab/web-kit/room';

interface Props {
  home: PortalHome;
  onOpen: (studentId: string) => void;
}

/** docs/50 §6. */
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
