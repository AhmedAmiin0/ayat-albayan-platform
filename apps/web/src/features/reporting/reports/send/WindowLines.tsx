import { lessonWhenAt, type ReportView } from '@ab/shared';
import { editableNow, reportSendState, sendLines, type SendState, type SendWords } from '@ab/client-core';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { ReportLink } from '@/features/reporting/reports/history/ReportLink';

/** The countdown is in whole minutes: a 15 s tick keeps it within a quarter of one. */
const TICK_MS = 15_000;

const WORDS: SendWords = {
  editUntil: t.reports.editUntil,
  editClosed: t.reports.editClosed,
  ...t.reports.familySend,
  minutes: t.settingsValues.units.minutes,
};

type WindowReport = Pick<ReportView, 'status' | 'can_edit' | 'edit_until' | 'sent_at'>;

/**
 * docs/46 B5, under a submitted report: «يمكنك تعديل التقرير حتى …» (or «انتهت مدة التعديل»), and
 * where it stands with the family: «سيُرسل إلى الأسرة بعد 12 دقيقة», «… الآن», «أُرسل إلى الأسرة».
 * Re-read every 15 s so the countdown moves by itself.
 */
export function WindowLines({ report, tz }: { report: WindowReport; tz: string }) {
  const clock = useClock();
  const now = useNow(TICK_MS);
  const lines = sendLines(report, { now, when: (d) => lessonWhenAt(d, { tz, ...clock }), words: WORDS });
  return (
    <>
      {[lines.edit, lines.family].filter((l) => l !== null).map((line) => (
        <p key={line} role="status" className="flex items-center gap-1.5 text-xs text-ink-2">
          <NuqtaGlyph shape="hollow" className="text-ink-3" />
          {line}
        </p>
      ))}
    </>
  );
}

const PENDING: ReadonlySet<SendState> = new Set(['window', 'sending']);

/**
 * A list row's short form (the teacher's sent reports): «تعديل التقرير» while the window is still
 * open on this clock (not the cached can_edit), else «عرض التقرير», and the family line only while
 * the report has not gone yet.
 */
export function RowWindow({ report, href }: { report: WindowReport; href: string }) {
  const now = useNow(TICK_MS);
  const lines = sendLines(report, { now, when: () => '', words: WORDS });
  const pending = PENDING.has(reportSendState(report, now));
  return (
    <span className="grid justify-items-start gap-1">
      <ReportLink href={href}>{editableNow(report, now) ? t.reports.edit : t.reports.view}</ReportLink>
      {pending && lines.family && <span className="text-xs whitespace-normal text-ink-3">{lines.family}</span>}
    </span>
  );
}
