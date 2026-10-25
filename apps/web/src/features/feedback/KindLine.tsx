import { RequiredMark } from '@/components/ui/form/label';
import { t } from '@/lib/i18n/i18n';
import type { FeedbackKind } from './types';

/**
 * «نوع الحلقة *» is the lesson's own (the server derives it), so the family sees it as a fixed
 * line, not a choice they could try to change.
 */
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
