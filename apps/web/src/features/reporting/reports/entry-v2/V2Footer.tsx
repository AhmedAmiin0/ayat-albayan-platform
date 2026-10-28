import type { ReportFormResponse } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { FooterAlerts } from '../entry/FooterAlerts';
import { SaveStatus } from '../history/ReportStatusLine';
import type { ReportEntryV2State } from './use-report-entry-v2';

function sendLabel(s: ReportEntryV2State): string {
  if (s.submit.isPending) return t.reports.submitting;
  return s.report.status === 'draft' ? t.reports.v2.send : t.reports.v2.saveEdit;
}

export interface V2FooterProps {
  s: ReportEntryV2State;
  block: ReportFormResponse['submit_block'];
  tz: string;
}

/** What stops the send, the sent state, then «أرسل التقرير إلى الأسرة» / «احفظ مسودة» and the hint. */
export function V2Footer({ s, block, tz }: V2FooterProps) {
  const { report } = s;
  const draft = report.status === 'draft';
  return (
    <footer className="grid gap-3 border-t border-rule pt-4">
      <FooterAlerts problem={s.problem} error={s.submit.error} block={block} report={report} tz={tz} />
      <div className="flex flex-wrap items-center gap-3">
        {report.can_edit && (
          <Button type="button" size="lg" disabled={block !== null || s.submit.isPending} onClick={s.send}>
            {sendLabel(s)}
          </Button>
        )}
        {draft && (
          <Button type="button" variant="secondary" size="lg" onClick={s.saveNow}>
            {t.reports.v2.saveDraft}
          </Button>
        )}
        {draft && <SaveStatus state={s.saveState} tz={tz} />}
      </div>
      {report.can_edit && <p className="text-xs text-ink-3">{t.reports.v2.sendHint}</p>}
    </footer>
  );
}
