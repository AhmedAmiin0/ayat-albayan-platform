import { studentOf } from '@ab/client-core';
import { EmptyState, t } from '@ab/web-kit';
import { ChildBody } from '@/features/children/ChildBody';
import { ChildHead } from '@/features/children/ChildHead';
import { BackToChildren } from './BackToChildren';
import type { Props } from './ChildPage.types';

/** A guardian's child (/children/<id>): back to every child, the name, then the tabs. */
export function ChildPage({ home, studentId, tab, onTab }: Props) {
  const student = studentOf(home, studentId);
  if (!student) return <EmptyState title={t.common.notFound} action={<BackToChildren />} />;
  return (
    <div className="grid gap-4">
      <div className="justify-self-start">
        <BackToChildren />
      </div>
      <ChildHead student={student} />
      <ChildBody student={student} kind={home.kind} tab={tab} onTab={onTab} />
    </div>
  );
}
