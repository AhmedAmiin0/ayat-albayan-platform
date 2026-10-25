import { t } from '@/lib/i18n/i18n';

/** «جارٍ التسجيل» while LiveKit egress records the room: a pulsing dot plus the words (never colour alone). */
export function RecIndicator() {
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-danger/25 bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-danger" />
      {t.classroom.recordingNow}
    </span>
  );
}
