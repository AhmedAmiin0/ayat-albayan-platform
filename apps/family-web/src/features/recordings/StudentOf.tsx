import type { PortalStudent } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState, buttonVariants } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';
import { WithHome } from '#/features/shell/index.ts';

interface Props {
  studentId: string;
  children: (student: PortalStudent) => ReactNode;
}

/**
 * The login's student named in the link; another family's (or none) is «لم نجد ما تبحث عنه»
 * with the way home: the API would refuse it anyway (404).
 */
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
