import { sendLines, type SendWords } from '@ab/client-core';
import type { ReportFormResponse, ReportView } from '@ab/shared';
import { pdfStatusStyle, reportStatusStyle } from '@ab/money';
import type { ClockCycle } from '@ab/time';
import { clockIn, useClockCycle, whenIn } from '@/core/lib/clock';
import { View } from 'react-native';
import { t, StatusChip, ErrorLine, useNow } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { reportErrorText } from '@/teacher/report/hooks/api';
import type { SaveState } from '@ab/client-core';
import type { ReportEntryState } from '@/teacher/report/hooks/use-report-entry';
import { useWindowClose } from '@/teacher/report/hooks/use-window-close';
import { SendButton } from './SendButton';
import { SentPanel } from './SentPanel';

const ERRORS: Record<string, string> = t.reports.error;

export function saveLine(state: SaveState, tz: string, cycle: ClockCycle): string | null {
  if (state.kind === 'saving') return t.reports.autosaving;
  if (state.kind === 'saved')
    return t.reports.draftSaved.replace('{time}', clockIn(state.at, tz, cycle));
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

/** Window lines (docs/46 B5) are live; at the close the form and lists are fetched again. */
export function SentNote({ report, tz }: { report: ReportView; tz: string }) {
  const cycle = useClockCycle();
  const now = useNow();
  useWindowClose(report);
  const lines = sendLines(report, { now, when: (d) => whenIn(d, tz, cycle), words: WORDS });
  const pdf = report.pdf_status && PDF_SHOWN.has(report.pdf_status) ? report.pdf_status : null;
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <StatusChip {...reportStatusStyle.submitted} label={t.reports.submitted} size="sm" />
        <Note>{t.reports.version.replace('{n}', String(report.version))}</Note>
        {pdf ? (
          <StatusChip
            {...pdfStatusStyle[pdf]}
            size="sm"
            label={`${t.reports.pdfLabel}: ${t.enums.pdfStatus[pdf]}`}
          />
        ) : null}
      </View>
      {lines.edit ? <Note>{lines.edit}</Note> : null}
      {lines.family ? <Note>{lines.family}</Note> : null}
    </>
  );
}

export function ReportFooter({
  s,
  block,
  tz,
}: {
  s: ReportEntryState;
  block: ReportFormResponse['submit_block'];
  tz: string;
}) {
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
      <SentPanel
        report={report}
        mode={s.mode.mode}
        onEdit={s.mode.startEdit}
        tz={tz}
        busy={s.submit.isPending}
      />
      {s.mode.locked ? null : (
        <SendButton
          label={label}
          pending={s.submit.isPending}
          disabled={block !== null}
          onPress={s.send}
        />
      )}
      {saved ? <Note>{saved}</Note> : null}
    </View>
  );
}
