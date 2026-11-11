import { sendLines, type SendWords } from '@ab/client-core';
import { pdfStatusStyle, reportStatusStyle, type ClockCycle, type ReportFormResponse, type ReportView } from '@ab/shared';
import { clockIn, useClockCycle, whenIn } from '@/core/lib/clock';
import { View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { Note } from '@/core/ui/feedback/Note';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { reportErrorText } from '@/teacher/report/hooks/api';
import type { SaveState } from '@/teacher/report/hooks/use-autosave';
import type { ReportEntryState } from '@/teacher/report/hooks/use-report-entry';
import { useWindowClose } from '@/teacher/report/hooks/use-window-close';
import { SendButton } from './SendButton';
import { SentPanel } from './SentPanel';

const ERRORS: Record<string, string> = t.reports.error;

/** «بيتحفظ…» / «المسودة اتحفظت 17:42» / a failed save, while the report is a draft. */
export function saveLine(state: SaveState, tz: string, cycle: ClockCycle): string | null {
  if (state.kind === 'saving') return t.reports.autosaving;
  if (state.kind === 'saved') return t.reports.draftSaved.replace('{time}', clockIn(state.at, tz, cycle));
  return state.kind === 'failed' ? t.reports.saveFailed : null;
}

const WORDS: SendWords = {
  editUntil: t.reports.editUntil,
  editClosed: t.reports.editClosed,
  ...t.reports.familySend,
  minutes: t.settingsValues.units.minutes,
};
/** The PDF chip once it says something (ready, or failed): not while it waits for the close. */
const PDF_SHOWN: ReadonlySet<string> = new Set(['ready', 'failed']);

/**
 * «أُرسل التقرير», its version, the PDF once ready, then the window lines (docs/46 B5): until when
 * it may still be edited, and «سيُرسل إلى الأسرة بعد 12 دقيقة» / «… الآن» / «أُرسل إلى الأسرة»,
 * live (useNow); at the close the form and the lists are fetched again (useWindowClose).
 */
export function SentNote({ report, tz }: { report: ReportView; tz: string }) {
  const cycle = useClockCycle();
  const now = useNow();
  useWindowClose(report.edit_until);
  const lines = sendLines(report, { now, when: (d) => whenIn(d, tz, cycle), words: WORDS });
  const pdf = report.pdf_status && PDF_SHOWN.has(report.pdf_status) ? report.pdf_status : null;
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <StatusChip {...reportStatusStyle.submitted} label={t.reports.submitted} size="sm" />
        <Note>{t.reports.version.replace('{n}', String(report.version))}</Note>
        {pdf ? (
          <StatusChip {...pdfStatusStyle[pdf]} size="sm" label={`${t.reports.pdfLabel}: ${t.enums.pdfStatus[pdf]}`} />
        ) : null}
      </View>
      {lines.edit ? <Note>{lines.edit}</Note> : null}
      {lines.family ? <Note>{lines.family}</Note> : null}
    </>
  );
}

/**
 * The end of a student's report: what stops the submit (validation, the lesson not started, an API
 * refusal or no connection), the sent state with its edit window, then «إرسال التقرير» /
 * «حفظ التعديل» and the autosave line.
 */
export function ReportFooter({ s, block, tz }: { s: ReportEntryState; block: ReportFormResponse['submit_block']; tz: string }) {
  const cycle = useClockCycle();
  const { report } = s;
  const sent = report.status === 'submitted';
  const saved = report.status === 'draft' ? saveLine(s.saveState, tz, cycle) : null;
  const label = sent ? t.reports.resubmit : t.reports.submit;
  return (
    <View style={{ gap: 8 }}>
      {s.problem ? <ErrorLine message={ERRORS[s.problem] ?? t.common.error} /> : null}
      {s.submit.error ? <ErrorLine message={reportErrorText(s.submit.error)} /> : null}
      {block ? <ErrorLine message={ERRORS[block] ?? t.common.error} /> : null}
      {sent ? <SentNote report={report} tz={tz} /> : null}
      <SentPanel report={report} mode={s.mode.mode} onEdit={s.mode.startEdit} tz={tz}
        busy={s.submit.isPending} />
      {s.mode.locked ? null : (
        <SendButton label={label} pending={s.submit.isPending} disabled={block !== null} onPress={s.send} />
      )}
      {saved ? <Note>{saved}</Note> : null}
    </View>
  );
}
