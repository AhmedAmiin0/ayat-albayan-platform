import { t } from '@/lib/i18n/i18n';

/** «تُسجَّل هذه الجلسة»: said before a guest joins, since every room is recorded (consent). */
export function RecordedNotice() {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-2">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-danger" />
      {t.classroom.recordedNotice}
    </p>
  );
}
