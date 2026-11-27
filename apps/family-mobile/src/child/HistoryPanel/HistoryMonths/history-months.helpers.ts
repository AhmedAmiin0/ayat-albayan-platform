import type { PortalHistoryStatus } from '@ab/shared';
import { t } from '@ab/mobile-kit';

export const EMPTY: Record<PortalHistoryStatus, () => string> = {
  attended: () => t.portal.attendedEmpty,
  absent: () => t.portal.absentEmpty,
};
