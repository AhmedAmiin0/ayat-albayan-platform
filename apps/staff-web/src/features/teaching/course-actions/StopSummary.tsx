import { courseStopLessonsText, datesText } from '@ab/client-core';
import { COURSE_STOP_REASON_MAX, type CourseStopPreview } from '@ab/shared';
import { Field, Input, t, useViewerTz } from '@ab/web-kit';
import { Amount } from '@/features/finance/subscriptions';
import { dateLabel, dayIn } from '@/features/teaching/schedule';
import { StopMoneyChoice } from './refund/StopMoneyChoice';
import type { StopMoneyView } from './refund/use-stop-money';

/** What a stop does: N future lessons cancelled, the schedule ends, the money and history kept. */
function StopSummary({ preview, keeps }: { preview: CourseStopPreview; keeps: boolean }) {
  const words = t.courseActions.stop;
  const day = dayIn(useViewerTz());
  const starts = preview.futureStarts ?? [];
  const [before, after = ''] = words.money.split('{amount}');
  return (
    <div className="grid gap-2">
      <p className="text-sm text-ink-2">{words.intro}</p>
      <ul role="status" className="grid list-disc gap-1 rounded-md bg-sunk px-7 py-2.5 text-sm">
        <li className="font-semibold">{courseStopLessonsText(words.lessons, preview)}</li>
        {starts.length > 0 && <li>{words.cancelsOn.replace('{dates}', datesText(starts, day))}</li>}
        <li>{words.schedule}</li>
        {keeps && (
          <li>
            {before}
            <Amount amount={preview.paid} currency={preview.currency} />
            {after}
          </li>
        )}
        <li>{words.history}</li>
        <li>{words.status}</li>
      </ul>
      <p className="text-sm text-ink-2">{t.courseCard.notifyNone}</p>
    </div>
  );
}

/** Shown instead of the button. */
function StoppedLine({ stopped }: { stopped: NonNullable<CourseStopPreview['stopped']> }) {
  const words = t.courseActions.stop;
  return (
    <p role="status" className="grid gap-1 rounded-md bg-sunk px-3.5 py-2.5 text-sm">
      <span>{words.stopped.replace('{date}', dateLabel(stopped.at.slice(0, 10)))}</span>
      {stopped.reason && (
        <span className="text-ink-2">
          {words.stoppedReason.replace('{reason}', stopped.reason)}
        </span>
      )}
    </p>
  );
}

interface BodyProps {
  preview: CourseStopPreview;
  /** `missing` shows the required error after confirm. */
  reason: { value: string; onChange: (v: string) => void; missing: boolean };
  /** The money choice. */
  money: StopMoneyView;
}

export function StopBody({ preview, reason, money }: BodyProps) {
  const words = t.courseActions.stop;
  if (preview.stopped) return <StoppedLine stopped={preview.stopped} />;
  return (
    <>
      <StopSummary preview={preview} keeps={money.state.mode !== 'refund'} />
      {money.money && <StopMoneyChoice preview={preview} view={money} money={money.money} />}
      <Field
        label={words.reason}
        hint={words.reasonHint}
        error={reason.missing ? words.reasonRequired : undefined}
      >
        {(p) => (
          <Input
            {...p}
            value={reason.value}
            required
            maxLength={COURSE_STOP_REASON_MAX}
            onChange={(e) => reason.onChange(e.target.value)}
          />
        )}
      </Field>
    </>
  );
}
