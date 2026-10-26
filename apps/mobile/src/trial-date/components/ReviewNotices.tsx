import type { BookFailure } from '@/booking/shared/booking-errors';
import { ConflictNotice } from '@/booking/shared/ConflictNotice';
import { ErrorLine } from '@/inbox/ErrorLine';

interface ReviewNoticesProps {
  /** The check's clashes, one line each (booking.conflict.<kind>). */
  clashes: readonly string[];
  /** The failed «احجز», if any. */
  failure: BookFailure | null;
  onChangeSlot: () => void;
}

/** The clashes (from the check, or the 409 of the booking itself) with «اختر موعدًا آخر», or the refusal. */
export function ReviewNotices({ clashes, failure, onChangeSlot }: ReviewNoticesProps) {
  if (clashes.length > 0) return <ConflictNotice lines={clashes} onChangeSlot={onChangeSlot} />;
  if (!failure) return null;
  if (failure.kind === 'conflict') return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
  return 'text' in failure ? <ErrorLine message={failure.text} /> : null;
}
