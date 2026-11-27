import { t } from '@ab/mobile-kit';
import { ownPage, useRefreshPortal } from '@/portal';
import type { StudentHomeProps } from './StudentHome.types';

export function useStudentHome({ student, kind }: Pick<StudentHomeProps, 'student' | 'kind'>) {
  const refresh = useRefreshPortal();
  const over = ownPage(kind, student) ? t.portal.app.home.greeting : undefined;
  return { refresh, over };
}
