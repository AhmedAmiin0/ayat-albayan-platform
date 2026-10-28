import type { ReportFormResponse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useClockCycle } from '@/core/lib/clock';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '@/inbox';
import { Note } from '@/more';
import { reportErrorText } from '../hooks/api';
import { SentNote, saveLine } from '../components/ReportFooter';
import type { V2EntryState } from './hooks/use-v2-entry';

const ERRORS: Record<string, string> = t.reports.error;

/** What stops the send: the form's own check, an API refusal or no connection, the lesson's state. */
function Problems({ s, block }: { s: V2EntryState; block: ReportFormResponse['submit_block'] }) {
  const lines = [
    s.problem ? (ERRORS[s.problem] ?? t.common.error) : null,
    s.submit.error ? reportErrorText(s.submit.error) : null,
    block ? (ERRORS[block] ?? t.common.error) : null,
  ];
  return <>{lines.map((line, i) => (line ? <ErrorLine key={i} message={line} /> : null))}</>;
}

/**
 * The end of a v2 report: what stops the send, the sent state with its edit window, then
 * «أرسل التقرير إلى الأسرة» (after a send «احفظ التعديل»), «احفظ مسودة» while a draft, and the save line.
 */
export function V2Footer({
  s,
  block,
  tz,
}: {
  s: V2EntryState;
  block: ReportFormResponse['submit_block'];
  tz: string;
}) {
  const cycle = useClockCycle();
  const v2 = t.reports.v2;
  const { report } = s;
  const sent = report.status === 'submitted';
  const draft = report.status === 'draft' && report.can_edit;
  const saved = report.status === 'draft' ? saveLine(s.saveState, tz, cycle) : null;
  const label = s.submit.isPending ? t.reports.submitting : sent ? v2.saveEdit : v2.send;
  return (
    <View style={{ gap: 8 }}>
      <Problems s={s} block={block} />
      {sent ? <SentNote report={report} tz={tz} /> : null}
      {report.can_edit ? (
        <>
          <Button label={label} busy={s.submit.isPending || block !== null} onPress={s.send} />
          {draft ? (
            <Button
              variant="secondary"
              label={v2.saveDraft}
              busy={s.saveState.kind === 'saving'}
              onPress={s.saveDraft}
            />
          ) : null}
          <Note>{v2.sendHint}</Note>
        </>
      ) : null}
      {saved ? <Note>{saved}</Note> : null}
    </View>
  );
}
