import type { PortalHistoryRow } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Excused absences say so, with the family's reason when recorded. */
export function AbsenceLines({ row }: { row: PortalHistoryRow }) {
  return (
    <>
      {row.outcome === 'excused' && <p className="text-sm text-ink-2">{t.portal.excused}</p>}
      {row.absence_reason && (
        <p className="text-sm text-ink-2">
          {t.portal.absenceReason.replace('{reason}', row.absence_reason)}
        </p>
      )}
    </>
  );
}
