import { lessonWhenAt, type ReportView } from '@ab/shared';
import { editableNow, reportSendState, sendLines, type SendState, type SendWords } from '@ab/client-core';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
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

/** docs/46 B5: the edit window and family delivery lines, re-read every 15 s for the countdown. */
export function WindowLines({ report, tz }: { report: WindowReport; tz: string }) {
  const clock = useClock();
  const now = useNow(TICK_MS);
  const when = (d: Date) => lessonWhenAt(d, { tz, ...clock });
  const lines = sendLines(report, { now, when, words: WORDS });
  return (
    <>
      {[lines.edit, lines.family].filter((l) => l !== null).map((line) => (
        <p key={line} className="flex items-center gap-1.5 text-xs text-ink-2">
          <NuqtaGlyph shape="hollow" className="text-ink-3" />
          {line}
        </p>
      ))}
    </>
  );
}

const PENDING: ReadonlySet<SendState> = new Set(['window', 'sending']);

/** Uses the window on this clock, not the cached can_edit; family line only before it is sent. */
export function RowWindow({ report, href }: { report: WindowReport; href: string }) {
  const now = useNow(TICK_MS);
  const lines = sendLines(report, { now, when: () => '', words: WORDS });
  const pending = PENDING.has(reportSendState(report, now));
  const label = editableNow(report, now) ? t.reports.edit : t.reports.view;
  return (
    <span className="grid justify-items-start gap-1">
      <ReportLink href={href}>{label}</ReportLink>
      {pending && lines.family && (
        <span className="text-xs whitespace-normal text-ink-3">{lines.family}</span>
      )}
    </span>
  );
}
