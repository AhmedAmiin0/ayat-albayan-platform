import type { ReportFormResponse } from '@ab/shared';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { ReportApiContext } from '@/features/reporting/reports/report-api';
import { ReportEntryForm } from '@/features/reporting/reports/ReportEntryForm';
import { linkReportApi } from './link-api';

export interface LinkReportEntriesProps {
  token: string;
  form: ReportFormResponse;
}

/** Every student of the link's lesson, saved and sent through the link. */
export function LinkReportEntries({ token, form }: LinkReportEntriesProps) {
  const { entries } = form;
  if (entries.length === 0) return <FormAlert>{t.common.notFound}</FormAlert>;
  return (
    <ReportApiContext value={linkReportApi(token)}>
      <div className="grid gap-10">
        {entries.map((entry) => (
          <ReportEntryForm key={entry.report.id} form={form} entry={entry} role="teacher"
            titled={entries.length > 1} tz={form.lesson.teacher.tz} />
        ))}
      </div>
    </ReportApiContext>
  );
}
