import { historyMonths, historyRows } from '@ab/client-core';
import type { PortalHistoryStatus } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalHistoryQuery } from '@ab/web-kit/portal/api';
import type { Props } from './HistoryPanel.types';

const EMPTY: Record<PortalHistoryStatus, () => [string, string]> = {
  attended: () => [t.portal.attendedEmpty, t.portal.attendedEmptyHint],
  absent: () => [t.portal.absentEmpty, t.portal.absentEmptyHint],
};
export function useHistoryPanel({ student, status }: Pick<Props, 'student' | 'status'>) {
  const query = useInfiniteQuery({
    ...portalHistoryQuery({ studentId: student.id, status }),
    select: (data) => historyMonths(historyRows(data.pages, status), student.tz),
  });
  const [title, hint] = EMPTY[status]();
  return { query, title, hint };
}
