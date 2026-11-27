import { counted } from '@ab/core';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { NewReportsProps } from './NewReports.types';
import { useNewReports } from './use-new-reports';

/** Sent reports not opened in this browser yet; nothing when none. */
export function NewReports({ studentId }: NewReportsProps) {
  const { count } = useNewReports({ studentId });
  if (count === 0) return null;
  return (
    <span className="rounded-sm bg-act-soft px-2 py-0.5 text-xs font-semibold text-act">
      {counted(t.portal.newReports, count)}
    </span>
  );
}
