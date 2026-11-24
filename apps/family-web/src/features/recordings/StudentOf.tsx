import type { PortalStudent } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { WithHome } from '@/features/shell';

interface Props {
  studentId: string;
  children: (student: PortalStudent) => ReactNode;
}

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
