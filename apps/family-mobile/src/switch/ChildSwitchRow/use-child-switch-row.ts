import { isSelfChild, newReportCount } from '@ab/client-core';
import { t } from '@ab/mobile-kit';
import { useChildReports, useSeenReports } from '@/portal';
import type { ChildSwitchRowProps } from './ChildSwitchRow.types';
import { useNextLine } from './use-next-line';

export function useChildSwitchRow({
  student,
  kind,
}: Pick<ChildSwitchRowProps, 'student' | 'kind'>) {
  const reports = useChildReports(student.id).data?.reports ?? [];
  const fresh = newReportCount(reports, useSeenReports()) > 0;
  const name = isSelfChild(kind, student) ? t.portal.app.pick.me : student.name;
  const next = useNextLine(student);
  return { fresh, name, next };
}
