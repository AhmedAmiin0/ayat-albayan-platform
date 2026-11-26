import { Link } from '@tanstack/react-router';
import { EmptyState, buttonVariants, t } from '@ab/web-kit';
import { WithHome } from '@/features/shell';
import type { Props } from './StudentOf.types';

/** Another family's student shows not-found; the API would refuse it anyway (404). */
export function StudentOf({ studentId, children }: Props) {
  return (
    <WithHome>
      {(home) => {
        const student = home.students.find((s) => s.id === studentId);
        if (student) return children(student);
        const goHome = (
          <Link to="/portal" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            {t.familyWeb.routeError.home}
          </Link>
        );
        return <EmptyState title={t.common.notFound} action={goHome} />;
      }}
    </WithHome>
  );
}
