import { RequiredMark, t } from '@ab/web-kit';
import type { FeedbackKind } from '@/features/teaching/feedback/types';

/** The server derives the kind, so the family sees it as fixed, not a choice. */
export function KindLine({ kind }: { kind: FeedbackKind }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-semibold">
        {t.feedback.kind}
        <RequiredMark />
      </p>
      <p className="inline-flex min-h-11 items-center rounded-md bg-sunk px-3 text-sm font-medium text-ink-2 justify-self-start">
        {t.enums.feedbackKind[kind]}
      </p>
    </div>
  );
}
