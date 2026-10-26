import { lessonWhenText, type PortalReport, type PortalStudent } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/display/empty-state';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { portalFileUrl, portalReportsQuery } from './api';
import { LoadState } from './LoadState';
import { openAfter } from './open-file';

type Open = { kind: 'reports' | 'recordings'; id: string };

/** «تقارير الحلقات»: the reports already sent to the family, newest first; each file opens by a fresh signed link. */
export function ReportsPanel({ student }: { student: PortalStudent }) {
  const query = useQuery(portalReportsQuery(student.id));
  const open = useMutation({
    mutationFn: (file: Open) => openAfter(async () => (await portalFileUrl({ studentId: student.id, ...file })).url),
  });
  return (
    <LoadState query={query}>
      {({ reports }) =>
        reports.length === 0 ? (
          <EmptyState title={t.portal.reportsEmpty}>{t.portal.reportsEmptyHint}</EmptyState>
        ) : (
          <div className="grid gap-3">
            {open.isError && <FormAlert>{t.portal.fileFailed}</FormAlert>}
            <ul className="grid gap-3">
              {reports.map((r) => (
                <ReportRow key={r.id} report={r} tz={student.tz} busy={open.isPending} onOpen={(file) => open.mutate(file)} />
              ))}
            </ul>
          </div>
        )
      }
    </LoadState>
  );
}

function ReportRow({ report, tz, busy, onOpen }: { report: PortalReport; tz: string; busy: boolean; onOpen: (file: Open) => void }) {
  const when = (iso: string) => lessonWhenText(new Date(iso), tz, locale);
  const recording = report.recording_id;
  return (
    <li className="grid gap-2 rounded-lg border border-rule bg-raised p-4">
      <p className="text-body font-semibold">{t.portal.reportOf.replace('{date}', when(report.lesson_starts_at ?? report.sent_at))}</p>
      {report.teacher && <p className="text-sm text-ink-2">{t.portal.withTeacher.replace('{teacher}', teacherLabel(report.teacher))}</p>}
      <p className="text-xs text-ink-3">{t.portal.sentOn.replace('{date}', when(report.sent_at))}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => onOpen({ kind: 'reports', id: report.id })}>
          {t.portal.openReport}
        </Button>
        {recording && (
          <Button type="button" variant="secondary" disabled={busy} onClick={() => onOpen({ kind: 'recordings', id: recording })}>
            {t.portal.openRecording}
          </Button>
        )}
      </div>
    </li>
  );
}
