import { t } from '@ab/web-kit/lib/i18n/i18n';

/** A pulsing dot plus words, never colour alone, while LiveKit egress records. */
export function RecIndicator() {
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-danger/25 bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-danger" />
      {t.classroom.recordingNow}
    </span>
  );
}
