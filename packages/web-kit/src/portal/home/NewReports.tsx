import { newReportCount } from '@ab/client-core';
import { counted } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalReportsQuery } from '@ab/web-kit/portal/api';
import { useSeenReports } from '@ab/web-kit/portal/use-seen-reports';

/** Sent reports not opened in this browser yet; nothing when none. */
export function NewReports({ studentId }: { studentId: string }) {
  const reports = useQuery(portalReportsQuery(studentId)).data?.reports ?? [];
  const count = newReportCount(reports, useSeenReports());
  if (count === 0) return null;
  return (
    <span className="rounded-sm bg-act-soft px-2 py-0.5 text-xs font-semibold text-act">
      {counted(t.portal.newReports, count)}
    </span>
  );
}
