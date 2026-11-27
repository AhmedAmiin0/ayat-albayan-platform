import type { PortalHome } from '@ab/shared';
import type { Props } from '@/features/recordings/StudentOf/StudentOf.types';

export interface StudentFoundProps {
  home: PortalHome;
  studentId: string;
  page: Props['children'];
}
