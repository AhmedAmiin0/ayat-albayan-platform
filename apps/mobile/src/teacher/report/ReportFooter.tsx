import { clockTime, lessonWhenText, pdfStatusStyle, reportStatusStyle, type ReportFormResponse, type ReportView } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/StatusChip';
import { reportErrorText } from './api';
import type { SaveState } from './use-autosave';
import type { ReportEntryState } from './use-report-entry';

const ERRORS: Record<string, string> = t.reports.error;

/** «بيتحفظ…» / «المسودة اتحفظت 17:42» / a failed save, while the report is a draft. */
function saveLine(state: SaveState, tz: string): string | null {
  if (state.kind === 'saving') return t.reports.autosaving;
  if (state.kind === 'saved') return t.reports.draftSaved.replace('{time}', clockTime(state.at, tz));
  return state.kind === 'failed' ? t.reports.saveFailed : null;
}

/** After a submit: how long the teacher may still edit, or that the window closed. */
function windowLine(report: ReportView, tz: string): string | null {
  if (!report.can_edit) return t.reports.editClosed;
  return report.edit_until ? t.reports.editUntil.replace('{when}', lessonWhenText(new Date(report.edit_until), tz, locale)) : null;
}

/** «التقرير اتبعت», its version, the PDF state, and the edit window. */
function SentNote({ report, tz }: { report: ReportView; tz: string }) {
  const editWindow = windowLine(report, tz);
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <StatusChip {...reportStatusStyle.submitted} label={t.reports.submitted} size="sm" />
        <Note>{t.reports.version.replace('{n}', String(report.version))}</Note>
        {report.pdf_status ? (
          <StatusChip
            {...pdfStatusStyle[report.pdf_status]}
            size="sm"
            label={`${t.reports.pdfLabel}: ${t.enums.pdfStatus[report.pdf_status]}`}
          />
        ) : null}
      </View>
      {editWindow ? <Note>{editWindow}</Note> : null}
    </>
  );
}

/**
 * The end of a student's report: what stops the submit (validation, the lesson not started, an API
 * refusal or no connection), the sent state with its edit window, then «إرسال التقرير» /
 * «حفظ التعديل» and the autosave line.
 */
export function ReportFooter({ s, block, tz }: { s: ReportEntryState; block: ReportFormResponse['submit_block']; tz: string }) {
  const { report } = s;
  const sent = report.status === 'submitted';
  const saved = report.status === 'draft' ? saveLine(s.saveState, tz) : null;
  const label = s.submit.isPending ? t.reports.submitting : sent ? t.reports.resubmit : t.reports.submit;
  return (
    <View style={{ gap: 8 }}>
      {s.problem ? <ErrorLine message={ERRORS[s.problem] ?? t.common.error} /> : null}
      {s.submit.error ? <ErrorLine message={reportErrorText(s.submit.error)} /> : null}
      {block ? <ErrorLine message={ERRORS[block] ?? t.common.error} /> : null}
      {sent ? <SentNote report={report} tz={tz} /> : null}
      {report.can_edit ? (
        <Button label={label} busy={s.submit.isPending || block !== null} onPress={s.send} />
      ) : null}
      {saved ? <Note>{saved}</Note> : null}
    </View>
  );
}
