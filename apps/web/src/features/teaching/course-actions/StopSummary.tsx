import { courseStopLessonsText } from '@ab/client-core';
import { COURSE_STOP_REASON_MAX, type CourseStopPreview } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Amount } from '@/features/finance/subscriptions';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';

/** What a stop does: N future lessons cancelled, the schedule ends, the money and history kept. */
function StopSummary({ preview }: { preview: CourseStopPreview }) {
  const words = t.courseActions.stop;
  const [before, after = ''] = words.money.split('{amount}');
  return (
    <div className="grid gap-2">
      <p className="text-sm text-ink-2">{words.intro}</p>
      <ul role="status" className="grid list-disc gap-1 rounded-md bg-sunk px-7 py-2.5 text-sm">
        <li className="font-semibold">{courseStopLessonsText(words.lessons, preview)}</li>
        <li>{words.schedule}</li>
        <li>
          {before}
          <Amount amount={preview.paid} currency={preview.currency} />
          {after}
        </li>
        <li>{words.history}</li>
        <li>{words.status}</li>
      </ul>
    </div>
  );
}

/** «أُلغي الاشتراك في …» and its reason, instead of the button. */
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
  reason: string;
  onReason: (v: string) => void;
}

/** The preview, or «أُلغي الاشتراك في …» when it is already cancelled; then the reason. */
export function StopBody({ preview, reason, onReason }: BodyProps) {
  const words = t.courseActions.stop;
  if (preview.stopped) return <StoppedLine stopped={preview.stopped} />;
  return (
    <>
      <StopSummary preview={preview} />
      <Field label={words.reason} hint={words.reasonHint}>
        {(p) => (
          <Input
            {...p}
            value={reason}
            required
            maxLength={COURSE_STOP_REASON_MAX}
            onChange={(e) => onReason(e.target.value)}
          />
        )}
      </Field>
    </>
  );
}
