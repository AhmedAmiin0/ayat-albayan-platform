import type { PortalKind, PortalStudent } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { buttonVariants, t } from '@ab/web-kit';

const BACK = buttonVariants({ variant: 'secondary', size: 'sm' });

/** Back to the student's page: a guardian's /children/<id>, a student's own home. */
export const BACK_TO: Readonly<Record<PortalKind, (student: PortalStudent) => ReactNode>> = {
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
