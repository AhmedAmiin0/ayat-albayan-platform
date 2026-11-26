import type { ChildTab } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { EmptyState, buttonVariants, t } from '@ab/web-kit';
import { ChildBody } from '@/features/children/ChildBody';
import { ChildHead } from '@/features/children/ChildHead';

interface Props {
  home: PortalHome;
  studentId: string;
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}

/** A guardian's child (/children/<id>): back to every child, the name, then the tabs. */
export function ChildPage({ home, studentId, tab, onTab }: Props) {
  const student = home.students.find((s) => s.id === studentId);
  const back = (
    <Link to="/children" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t.portal.allChildren}
    </Link>
  );
  if (!student) return <EmptyState title={t.common.notFound} action={back} />;
  return (
    <div className="grid gap-4">
      <div className="justify-self-start">{back}</div>
      <ChildHead student={student} />
      <ChildBody student={student} kind={home.kind} tab={tab} onTab={onTab} />
    </div>
  );
}
