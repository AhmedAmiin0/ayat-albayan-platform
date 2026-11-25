import type { ReportFormEntry, ReportFormResponse } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ReportEntryV2 } from '@/features/reporting/reports/entry-v2/ReportEntryV2';
import { ReportV2View } from './ReportV2View';

interface AdminReportV2Props {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  titled: boolean;
  tz: string;
}

/** Admins correct any report; a draft opens straight in the form. */
export function AdminReportV2({ form, entry, titled, tz }: AdminReportV2Props) {
  const [editing, setEditing] = useState(entry.report.status === 'draft');
  if (editing) return <ReportEntryV2 form={form} entry={entry} titled={titled} tz={tz} opened />;
  return (
    <div className="grid gap-3">
      <ReportV2View lesson={form.lesson} entry={entry} tz={tz} />
      <Button type="button" variant="secondary" className="justify-self-start" onClick={() => setEditing(true)}>
        {t.reports.edit}
      </Button>
    </div>
  );
}
