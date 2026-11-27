import type { PortalHome } from '@ab/shared';
import type { ReactNode } from 'react';
import { EmptyState, ListSkeleton, t } from '@ab/web-kit';
import { PickChildPage } from '@/features/children/PickChildPage';
import type { Waiting } from './Picked.types';

export const WAITING: Readonly<Record<Waiting, (home: PortalHome) => ReactNode>> = {
  loading: () => <ListSkeleton rows={3} />,
  choose: (home) => <PickChildPage home={home} />,
  empty: () => <EmptyState title={t.portal.noStudents}>{t.portal.noStudentsHint}</EmptyState>,
};
