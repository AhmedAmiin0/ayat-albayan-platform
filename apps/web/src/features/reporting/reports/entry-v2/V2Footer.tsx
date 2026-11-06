import type { ReportFormResponse } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { FooterAlerts } from '@/features/reporting/reports/entry/FooterAlerts';
import { SendButton } from '@/features/reporting/reports/send/SendButton';
import { SentPanel } from '@/features/reporting/reports/send/SentPanel';
import { SaveStatus } from '@/features/reporting/reports/history/ReportStatusLine';
import type { ReportEntryV2State } from './use-report-entry-v2';

export interface V2FooterProps {
  s: ReportEntryV2State;
  block: ReportFormResponse['submit_block'];
  tz: string;
}

/**
 * What stops the send, the sent state with «تعديل التقرير», then «أرسل التقرير إلى الأسرة» (an
 * edit: «حفظ التعديل»; disabled with a spinner while pending) / «احفظ مسودة» and the hint.
 */
export function V2Footer({ s, block, tz }: V2FooterProps) {
  const { report, mode } = s;
  const draft = report.status === 'draft';
  return (
    <footer className="grid gap-3 border-t border-rule pt-4">
      <FooterAlerts problem={s.problem} error={s.submit.error} block={block} report={report} tz={tz} />
      <SentPanel report={report} mode={mode.mode} onEdit={mode.startEdit} tz={tz}
        busy={s.submit.isPending} />
      <div className="flex flex-wrap items-center gap-3">
        {!mode.locked && (
          <SendButton label={draft ? t.reports.v2.send : t.reports.resubmit}
            pending={s.submit.isPending} disabled={block !== null} onClick={s.send} />
        )}
        {draft && (
          <Button type="button" variant="secondary" size="lg" onClick={s.saveNow}>
            {t.reports.v2.saveDraft}
          </Button>
        )}
        {draft && <SaveStatus state={s.saveState} tz={tz} />}
      </div>
      {!mode.locked && <p className="text-xs text-ink-3">{t.reports.v2.sendHint}</p>}
    </footer>
  );
}
