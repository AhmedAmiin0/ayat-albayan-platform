import { portalViewer, seesMoney, type ChildTab } from '@ab/client-core';
import type { PortalHome, PortalKind, PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ChildBody, ChildHead } from '@/features/children';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChildCard } from '@ab/web-kit/portal/home/ChildCard';

interface Props {
  home: PortalHome;
  /** A student's own page: the `?tab=` asked for, and the switch. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}

/** A guardian's home: «أهلًا بك», then a card per child; a card opens the child's page. */
function GuardianHome({ home }: { home: PortalHome }) {
  const navigate = useNavigate();
  const open = (student: PortalStudent) =>
    void navigate({ to: '/children/$studentId', params: { studentId: student.id } });
  return (
    <section aria-labelledby="home-title" className="grid gap-4">
      <div className="grid gap-0.5">
        <p className="text-sm text-ink-2">{t.portal.app.home.greeting}</p>
        <h1 id="home-title" className="font-display text-h2 font-bold">
          {t.portal.app.home.children}
        </h1>
      </div>
      {home.students.map((student) => (
        <ChildCard
          key={student.id}
          student={student}
          money={seesMoney(portalViewer(home.kind, student))}
          onOpen={() => open(student)}
        />
      ))}
    </section>
  );
}

/** A student's home is their own page (canvas StudentHome): the greeting over their name. */
function StudentHome({ home, tab, onTab }: Props) {
  const own = home.students[0];
  if (!own) return null;
  return (
    <div className="grid gap-4">
      <ChildHead student={own} over={t.portal.app.home.greeting} />
      <ChildBody student={own} kind="student" tab={tab} onTab={onTab} />
    </div>
  );
}

const VIEW: Readonly<Record<PortalKind, (props: Props) => ReactNode>> = {
  guardian: ({ home }) => <GuardianHome home={home} />,
  student: (props) => <StudentHome {...props} />,
};

/**
 * «الرئيسية» (docs/50 §6). A guardian: one card per child. A student: their own page (no list),
 * القادمة · حضرتها · غبت عنها (and الباقة for an adult who pays).
 */
export function HomePage(props: Props) {
  if (props.home.students.length === 0) {
    return <EmptyState title={t.portal.noStudents}>{t.portal.noStudentsHint}</EmptyState>;
  }
  return <>{VIEW[props.home.kind](props)}</>;
}
